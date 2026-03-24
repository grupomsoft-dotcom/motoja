import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import MapaMotorista from '../components/MapaMotorista'
import { Bike, MapPin, Check, X, Navigation, shadow, Loader2, AlertCircle } from 'lucide-react'

export default function MotoristaDashboard() {
  const { session } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState([])
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. Carregar solicitações pendentes ao montar o componente
  useEffect(() => {
    const buscarIniciais = async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'solicitada')
        .order('created_at', { ascending: false })

      if (!error) setSolicitacoes(data)
      setLoading(false)
    }

    buscarIniciais()
  }, [])

  // 2. Realtime: Ouvir novas corridas e atualizações
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase
      .channel('fila_motorista')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.solicitada' },
        (payload) => {
          console.log("Nova solicitação detectada!", payload.new)
          setSolicitacoes(prev => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides' },
        (payload) => {
          // Se a corrida que eu aceitei mudou (ex: passageiro cancelou)
          if (payload.new.id === corridaAtiva?.id) {
            setCorridaAtiva(payload.new)
            if (payload.new.status === 'cancelada') {
              alert("O passageiro cancelou a corrida.")
              setCorridaAtiva(null)
            }
          }
          // Remove da lista de disponíveis se alguém (eu ou outro) aceitou
          if (payload.new.status !== 'solicitada') {
            setSolicitacoes(prev => prev.filter(r => r.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, corridaAtiva])

  // 3. Ação de Aceitar Corrida
  const aceitarCorrida = async (rideId) => {
    const { data, error } = await supabase
      .from('rides')
      .update({ 
        motorista_id: session.user.id, 
        status: 'aceita' 
      })
      .eq('id', rideId)
      .select()
      .single()

    if (error) {
      alert("Erro ao aceitar: " + error.message)
    } else {
      setCorridaAtiva(data)
    }
  }

  // 4. Finalizar Corrida
  const finalizarCorrida = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'finalizada' })
      .eq('id', corridaAtiva.id)

    if (!error) {
      setCorridaAtiva(null)
      alert("Corrida finalizada com sucesso!")
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#0f172a]">
      <Loader2 className="animate-spin text-indigo-500" size={40} />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 lg:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO ESQUERDO: MAPA (OCUPA MAIS ESPAÇO) */}
        <div className="lg:col-span-8 h-[400px] lg:h-[600px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 bg-slate-800">
          <MapaMotorista corrida={corridaAtiva} />
        </div>

        {/* LADO DIREITO: PAINEL DE CONTROLE */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CARD DE CORRIDA ATIVA */}
          {corridaAtiva ? (
            <div className="bg-indigo-600 rounded-[2.5rem] p-6 shadow-xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase">Em Viagem</span>
                <Navigation size={20} />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-indigo-200 text-xs uppercase font-bold">Destino</p>
                  <p className="font-bold text-lg leading-tight">{corridaAtiva.destino}</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-indigo-200 text-xs uppercase font-bold">Valor Estimado</p>
                      <p className="text-2xl font-black">R$ {corridaAtiva.preco_estimado?.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={finalizarCorrida}
                      className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                      Finalizar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 text-center">
              <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bike className="text-emerald-500" size={32} />
              </div>
              <h3 className="font-bold text-white">Aguardando Chamadas</h3>
              <p className="text-slate-400 text-xs mt-2">Novas solicitações aparecerão aqui em tempo real.</p>
            </div>
          )}

          {/* LISTA DE CHAMADAS DISPONÍVEIS */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Solicitações Próximas</h4>
            
            {solicitacoes.length === 0 && !corridaAtiva && (
              <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                <p className="text-slate-500 text-sm italic">Nenhuma moto solicitada no momento...</p>
              </div>
            )}

            {solicitacoes.map((sol) => (
              <div 
                key={sol.id} 
                className="bg-slate-800 border border-white/5 p-5 rounded-3xl hover:border-indigo-500/50 transition-all group animate-in slide-in-from-right-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                      <MapPin size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Origem</span>
                    </div>
                    <p className="font-bold text-sm truncate">{sol.origem}</p>
                    <p className="text-slate-400 text-xs mt-1">Para: {sol.destino}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-indigo-400 text-sm">R${sol.preco_estimado}</p>
                    <button 
                      onClick={() => aceitarCorrida(sol.id)}
                      className="mt-3 bg-indigo-500 hover:bg-indigo-400 p-2 rounded-xl text-white transition-all active:scale-90"
                    >
                      <Check size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}