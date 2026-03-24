import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLocationTracker } from '../hooks/useLocationTracker'
import MapaMotorista from '../components/MapaMotorista'
import { 
  Bike, 
  MapPin, 
  Check, 
  Navigation, 
  Loader2, 
  AlertCircle,
  LogOut,
  History,
  DollarSign
} from 'lucide-react'

export default function MotoristaDashboard() {
  const { session } = useAuth()
  const [solicitacoes, setSolicitacoes] = useState([])
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [loading, setLoading] = useState(true)

  // 1. ATIVA O RASTREAMENTO GPS EM TEMPO REAL
  // Isso envia a posição para a tabela 'motorista_localizacoes' a cada 5 segundos
  useLocationTracker(session?.user?.id, true)

  // 2. BUSCA INICIAL DE CORRIDAS PENDENTES
  useEffect(() => {
    const buscarDadosIniciais = async () => {
      setLoading(true)
      
      // Busca solicitações abertas
      const { data: abertas } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'solicitada')
        .order('created_at', { ascending: false })

      if (abertas) setSolicitacoes(abertas)

      // Busca se o motorista já tem uma corrida em andamento (caso ele dê refresh na página)
      const { data: ativa } = await supabase
        .from('rides')
        .select('*')
        .eq('motorista_id', session.user.id)
        .in('status', ['aceita', 'em_andamento'])
        .single()

      if (ativa) setCorridaAtiva(ativa)
      
      setLoading(false)
    }

    if (session?.user?.id) buscarDadosIniciais()
  }, [session])

  // 3. REALTIME: OUVIR NOVAS CORRIDAS E CANCELAMENTOS
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase
      .channel('painel_motorista_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rides', filter: 'status=eq.solicitada' },
        (payload) => {
          console.log("Nova corrida disponível!", payload.new)
          setSolicitacoes(prev => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides' },
        (payload) => {
          // Se a corrida foi aceita por outro ou cancelada, remove da lista
          if (payload.new.status !== 'solicitada') {
            setSolicitacoes(prev => prev.filter(r => r.id !== payload.new.id))
          }
          // Se for a minha corrida atual e o passageiro cancelar
          if (payload.new.id === corridaAtiva?.id && payload.new.status === 'cancelada') {
            alert("O passageiro cancelou a corrida.")
            setCorridaAtiva(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, corridaAtiva])

  // 4. AÇÕES DO MOTORISTA
  const aceitarCorrida = async (rideId) => {
    const { data, error } = await supabase
      .from('rides')
      .update({ 
        motorista_id: session.user.id, 
        status: 'aceita',
        aceita_em: new Date().toISOString()
      })
      .eq('id', rideId)
      .select()
      .single()

    if (error) {
      alert("Esta corrida não está mais disponível.")
    } else {
      setCorridaAtiva(data)
    }
  }

  const finalizarCorrida = async () => {
    const { error } = await supabase
      .from('rides')
      .update({ status: 'finalizada', finalizada_em: new Date().toISOString() })
      .eq('id', corridaAtiva.id)

    if (!error) {
      setCorridaAtiva(null)
      alert("Corrida concluída! Dinheiro na conta. 💰")
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={48} />
        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Iniciando Sistemas...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: MAPA E NAVEGAÇÃO */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="h-[45vh] lg:h-[65vh] w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 relative bg-slate-800">
            <MapaMotorista corrida={corridaAtiva} />
          </div>
          
          {/* Card Mobile de Status */}
          <div className="lg:hidden bg-slate-800/50 p-4 rounded-3xl border border-white/5 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs font-black uppercase tracking-widest">Motorista Online</span>
             </div>
             <span className="text-indigo-400 font-bold text-sm">GPS Ativo</span>
          </div>
        </div>

        {/* COLUNA DIREITA: SOLICITAÇÕES E CONTROLES */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* SEÇÃO CORRIDA ATIVA */}
          {corridaAtiva ? (
            <div className="bg-indigo-600 rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-top-4">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <Navigation size={24} className="text-white" />
                </div>
                <span className="bg-black/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Passageiro Aguardando</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-indigo-200 text-[10px] font-black uppercase">Ponto de Encontro</p>
                  <p className="text-lg font-bold leading-tight mt-1">{corridaAtiva.origem}</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-indigo-200 text-[10px] font-black uppercase">Destino</p>
                  <p className="text-md font-medium text-white/90">{corridaAtiva.destino}</p>
                </div>
                
                <div className="flex items-center justify-between pt-4">
                   <div className="flex flex-col">
                      <span className="text-indigo-200 text-[10px] font-black uppercase">Ganhos</span>
                      <span className="text-2xl font-black">R$ {corridaAtiva.preco_estimado?.toFixed(2)}</span>
                   </div>
                   <button 
                    onClick={finalizarCorrida}
                    className="bg-white text-indigo-600 font-black px-8 py-4 rounded-2xl hover:scale-105 transition-transform shadow-lg active:scale-95"
                   >
                     FINALIZAR
                   </button>
                </div>
              </div>
            </div>
          ) : (
            /* STATUS QUANDO ESTÁ LIVRE */
            <div className="bg-slate-800/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse" />
                <div className="relative bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
                  <Bike size={32} className="text-emerald-500" />
                </div>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">Patrulhando Área</h3>
              <p className="text-slate-500 text-xs mt-2 px-4 leading-relaxed">
                As chamadas aparecerão aqui automaticamente via satélite.
              </p>
            </div>
          )}

          {/* LISTA DE CHAMADAS */}
          <div className="space-y-3">
             <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fila de Espera</h4>
                <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-md border border-white/5">
                  {solicitacoes.length} DISPONÍVEIS
                </span>
             </div>

             {solicitacoes.length === 0 && !corridaAtiva && (
               <div className="bg-slate-800/20 border-2 border-dashed border-white/5 rounded-[2rem] p-10 text-center">
                 <p className="text-slate-600 text-xs font-medium italic">Buscando passageiros próximos...</p>
               </div>
             )}

             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {solicitacoes.map((sol) => (
                  <div 
                    key={sol.id} 
                    className="bg-slate-800/80 border border-white/5 p-5 rounded-[2rem] hover:border-indigo-500/50 transition-all group animate-in slide-in-from-right-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 min-w-0">
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-500 uppercase">Origem</p>
                              <p className="font-bold text-sm truncate pr-2 text-white">{sol.origem}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-8 bg-indigo-500 rounded-full" />
                           <div className="min-w-0">
                              <p className="text-[10px] font-black text-slate-500 uppercase">Destino</p>
                              <p className="font-medium text-xs truncate pr-2 text-slate-300">{sol.destino}</p>
                           </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between h-full">
                         <span className="text-indigo-400 font-black text-sm whitespace-nowrap">R$ {sol.preco_estimado}</span>
                         <button 
                            onClick={() => aceitarCorrida(sol.id)}
                            className="mt-6 bg-indigo-600 hover:bg-indigo-500 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-110 active:scale-90"
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
    </div>
  )
}