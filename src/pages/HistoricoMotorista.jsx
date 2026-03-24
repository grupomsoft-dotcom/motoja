import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Clock, CheckCircle2, AlertCircle, TrendingUp, MapPin } from 'lucide-react'

export default function HistoricoMotorista() {
  const { session } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRides = async () => {
      if (!session?.user?.id) return
      setLoading(true)

      const { data, error } = await supabase
        .from('rides')
        .select('id, origem, destino, created_at, preco_final, status')
        .eq('motorista_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro:', error.message)
      } else {
        setRides(data || [])
      }
      setLoading(false)
    }

    fetchRides()
  }, [session])

  // Cálculos automáticos baseados no histórico carregado
  const estatisticas = useMemo(() => {
    const totalGeral = rides
      .filter(r => r.status === 'finalizada')
      .reduce((acc, curr) => acc + (Number(curr.preco_final) || 0), 0)
    
    return {
      total: totalGeral,
      contagem: rides.length
    }
  }, [rides])

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarDataHora = (iso) => {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderStatus = (status) => {
    const config = {
      finalizada: { color: 'text-emerald-400 bg-emerald-500/10', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Concluída' },
      cancelada: { color: 'text-red-400 bg-red-500/10', icon: <AlertCircle className="w-3 h-3" />, label: 'Cancelada' },
      pendente: { color: 'text-yellow-400 bg-yellow-500/10', icon: <Clock className="w-3 h-3" />, label: 'Em curso' },
    }
    const s = config[status] || { color: 'text-slate-400 bg-slate-500/10', icon: null, label: status }
    
    return (
      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${s.color}`}>
        {s.icon}
        {s.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 pb-12">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header Profissional */}
        <header className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Clock className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Meu Histórico</h1>
              <p className="text-slate-400 text-xs">Registros de suas corridas</p>
            </div>
          </div>
        </header>

        {/* Dashboard de Resumo */}
        {!loading && rides.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-xs mb-1">Ganhos Totais</p>
              <p className="text-xl font-bold text-emerald-400">{formatarMoeda(estatisticas.total)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-slate-400 text-xs mb-1">Total Corridas</p>
              <p className="text-xl font-bold text-white">{estatisticas.contagem}</p>
            </div>
          </div>
        )}

        {/* Lista de Corridas */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 animate-pulse">Buscando trajetos...</p>
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-400 text-sm">Nenhuma corrida encontrada.</p>
            </div>
          ) : (
            rides.map((ride) => (
              <div
                key={ride.id}
                className="group bg-white/5 hover:bg-white/[0.08] transition-all duration-300 rounded-2xl p-5 border border-white/10"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-white font-medium">
                       <MapPin className="w-4 h-4 text-slate-500" />
                       <span className="truncate max-w-[200px]">{ride.origem}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white font-medium pl-6 relative after:content-[''] after:absolute after:left-[7px] after:top-[-15px] after:w-[2px] after:h-[15px] after:bg-slate-700">
                       <span className="truncate max-w-[200px]">{ride.destino}</span>
                    </div>
                  </div>
                  {renderStatus(ride.status)}
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                  <span className="text-xs text-slate-500">
                    {formatarDataHora(ride.created_at)}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Valor Recebido</p>
                    <p className="text-lg font-bold text-white">
                      {ride.preco_final ? formatarMoeda(ride.preco_final) : '---'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}