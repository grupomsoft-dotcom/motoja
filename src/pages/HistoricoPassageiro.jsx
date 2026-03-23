import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function HistoricoPassageiro() {
  const { session } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('finalizadas') // 'todas' | 'em_aberto' | 'finalizadas'

  const formatarDataHora = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('pt-BR')
  }

  const statusLabel = (status) => {
    switch (status) {
      case 'solicitada':
        return 'Solicitada'
      case 'aceita':
        return 'Aceita'
      case 'finalizada':
        return 'Finalizada'
      case 'cancelada':
        return 'Cancelada'
      default:
        return status
    }
  }

  const aplicarFiltroLocal = (lista) => {
    if (filtro === 'todas') return lista

    if (filtro === 'em_aberto') {
      return lista.filter((r) => ['solicitada', 'aceita'].includes(r.status))
    }

    if (filtro === 'finalizadas') {
      return lista.filter((r) => r.status === 'finalizada')
    }

    return lista
  }

  useEffect(() => {
    const fetchRides = async () => {
      if (!session) return
      setLoading(true)

      // Busca todas as corridas do passageiro logado
      let query = supabase
        .from('rides')
        .select('*')
        .eq('passageiro_id', session.user.id)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error(error)
        alert('Erro ao carregar histórico: ' + error.message)
      } else {
        setRides(data || [])
      }
      setLoading(false)
    }

    fetchRides()
  }, [session])

  const ridesFiltradas = aplicarFiltroLocal(rides)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Clock className="w-10 h-10 text-white" />
            <div>
              <h1 className="text-2xl font-bold text-white">Histórico de Corridas</h1>
              <p className="text-white/80 text-sm">
                Veja suas corridas finalizadas ou em andamento
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                filtro === 'todas'
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltro('em_aberto')}
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                filtro === 'em_aberto'
                  ? 'bg-amber-400 text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Em aberto
            </button>
            <button
              onClick={() => setFiltro('finalizadas')}
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                filtro === 'finalizadas'
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Finalizadas
            </button>
          </div>
        </header>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
          {loading ? (
            <p className="text-white">Carregando histórico...</p>
          ) : ridesFiltradas.length === 0 ? (
            <p className="text-white">
              Nenhuma corrida encontrada para o filtro selecionado.
            </p>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              {ridesFiltradas.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-white">
                      {ride.origem} → {ride.destino}
                    </p>
                    <p className="text-white/80 text-sm">
                      Data: {formatarDataHora(ride.created_at)}
                    </p>
                    {ride.preco_final && (
                      <p className="text-emerald-300 text-sm font-semibold">
                        Valor final: R${ride.preco_final}
                      </p>
                    )}
                    {!ride.preco_final && ride.preco_estimado && (
                      <p className="text-amber-200 text-sm">
                        Preço estimado: R${ride.preco_estimado}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {ride.status === 'finalizada' && (
                      <span className="flex items-center gap-1 text-emerald-300 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Finalizada
                      </span>
                    )}
                    {ride.status === 'cancelada' && (
                      <span className="flex items-center gap-1 text-red-300 text-sm font-semibold">
                        <XCircle className="w-4 h-4" />
                        Cancelada
                      </span>
                    )}
                    {['solicitada', 'aceita'].includes(ride.status) && (
                      <span className="flex items-center gap-1 text-yellow-200 text-sm font-semibold">
                        ⏳ {statusLabel(ride.status)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
