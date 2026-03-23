import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Clock, CheckCircle2 } from 'lucide-react'

export default function HistoricoMotorista() {
  const { session } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRides = async () => {
      if (!session) return
      setLoading(true)

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('motorista_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        alert('Erro ao carregar histórico do motorista: ' + error.message)
      } else {
        setRides(data || [])
      }

      setLoading(false)
    }

    fetchRides()
  }, [session])

  const formatarDataHora = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center space-x-3">
          <Clock className="w-10 h-10 text-white" />
          <div>
            <h1 className="text-2xl font-bold text-white">Histórico de Atendimentos</h1>
            <p className="text-white/80 text-sm">
              Corridas em que você foi o motorista
            </p>
          </div>
        </header>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
          {loading ? (
            <p className="text-white">Carregando histórico...</p>
          ) : rides.length === 0 ? (
            <p className="text-white">Você ainda não atendeu nenhuma corrida.</p>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
              {rides.map((ride) => (
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
                  </div>
                  <div className="flex items-center gap-2">
                    {ride.status === 'finalizada' ? (
                      <span className="flex items-center gap-1 text-emerald-300 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Finalizada
                      </span>
                    ) : (
                      <span className="text-yellow-200 text-sm">
                        Status: {ride.status}
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
