import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth' // Importante para pegar o ID do motorista
import MapaMotorista from '../components/MapaMotorista'
import { Map, User, Navigation, CreditCard, Play, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

export default function MotoristaDashboard() {
  const { session } = useAuth()
  const [corridaAtual, setCorridaAtual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [erro, setErro] = useState(null)

  // 1. Carregar dados iniciais e Configurar Realtime
  useEffect(() => {
    if (!session?.user?.id) return

    const buscarCorridaAtiva = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('corridas')
        .select('*')
        .eq('motorista_id', session.user.id)
        .in('status', ['aceita', 'em_curso']) // Busca o que ele aceitou ou o que já está pilotando
        .maybeSingle()

      if (error) setErro('Erro ao carregar dados')
      else setCorridaAtual(data)
      setLoading(false)
    }

    buscarCorridaAtiva()

    // CONFIGURAÇÃO REALTIME: Ouve mudanças na tabela de corridas para este motorista
    const channel = supabase
      .channel('mudancas_corrida')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'corridas', 
          filter: `motorista_id=eq.${session.user.id}` 
        },
        (payload) => {
          // Se a corrida foi finalizada ou cancelada, limpamos o estado
          if (['finalizada', 'cancelada'].includes(payload.new.status)) {
            setCorridaAtual(null)
          } else {
            setCorridaAtual(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  // 2. Ações de Corrida
  const alterarStatusCorrida = async (novoStatus) => {
    if (!corridaAtual) return
    setActionLoading(true)
    
    const { error } = await supabase
      .from('corridas')
      .update({ status: novoStatus })
      .eq('id', corridaAtual.id)

    if (error) {
      alert('Erro ao atualizar status: ' + error.message)
    }
    setActionLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-24">
        
        {/* Painel de Controle */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 mb-4 shadow-xl">
          <header className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-400" />
                Painel Operacional
              </h2>
              <p className="text-slate-400 text-xs">Acompanhamento em tempo real</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              corridaAtual ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {corridaAtual ? '• Ocupado' : '• Disponível'}
            </div>
          </header>

          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : corridaAtual ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">{corridaAtual.nome_passageiro}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Map className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-slate-300">{corridaAtual.destino}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-300">{corridaAtual.pagamento}</span>
                </div>
              </div>

              {/* Botões Dinâmicos */}
              <div className="grid grid-cols-2 gap-3">
                {corridaAtual.status === 'aceita' ? (
                  <button
                    onClick={() => alterarStatusCorrida('em_curso')}
                    disabled={actionLoading}
                    className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><Play size={18} /> Iniciar Corrida</>}
                  </button>
                ) : (
                  <button
                    onClick={() => alterarStatusCorrida('finalizada')}
                    disabled={actionLoading}
                    className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Finalizar Corrida</>}
                  </button>
                )}
                
                <button className="col-span-2 text-slate-500 text-xs font-medium hover:text-red-400 transition-colors py-2">
                   Reportar Problema / Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Navigation className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm">Aguardando novas solicitações...</p>
            </div>
          )}
        </section>

        {/* Área do Mapa */}
        <section className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Navegação GPS</h3>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
          <div className="h-[50vh] relative">
            <MapaMotorista corrida={corridaAtual} />
          </div>
        </section>
      </div>
    </div>
  )
}