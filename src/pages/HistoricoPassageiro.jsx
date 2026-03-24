import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Clock, CheckCircle2, XCircle, MapPin, Search, Navigation } from 'lucide-react'

export default function HistoricoPassageiro() {
  const { session } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('finalizada') // 'todas' | 'em_aberto' | 'finalizada' | 'cancelada'

  // Busca de dados otimizada
  const fetchRides = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)

    let query = supabase
      .from('rides')
      .select('id, origem, destino, created_at, preco_final, preco_estimado, status')
      .eq('passageiro_id', session.user.id)
      .order('created_at', { ascending: false })

    // Aplicando filtro direto na query do Supabase para performance
    if (filtro === 'em_aberto') {
      query = query.in('status', ['solicitada', 'aceita', 'em_curso'])
    } else if (filtro !== 'todas') {
      query = query.eq('status', filtro)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao carregar:', error.message)
    } else {
      setRides(data || [])
    }
    setLoading(false)
  }, [session, filtro])

  useEffect(() => {
    fetchRides()
  }, [fetchRides])

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  const renderBadgeStatus = (status) => {
    const statusMap = {
      solicitada: { label: 'Buscando Moto...', color: 'text-amber-400 bg-amber-400/10', icon: <Search className="w-3 h-3" /> },
      aceita: { label: 'Motorista a Caminho', color: 'text-blue-400 bg-blue-400/10', icon: <Navigation className="w-3 h-3" /> },
      finalizada: { label: 'Finalizada', color: 'text-emerald-400 bg-emerald-400/10', icon: <CheckCircle2 className="w-3 h-3" /> },
      cancelada: { label: 'Cancelada', color: 'text-red-400 bg-red-400/10', icon: <XCircle className="w-3 h-3" /> }
    }

    const current = statusMap[status] || { label: status, color: 'text-slate-400 bg-slate-400/10', icon: null }

    return (
      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${current.color}`}>
        {current.icon}
        {current.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Clock className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Suas Viagens</h1>
              <p className="text-slate-400 text-sm">Histórico completo de pedidos</p>
            </div>
          </div>

          {/* Barra de Filtros Estilizada */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'todas', label: 'Todas' },
              { id: 'em_aberto', label: 'Em Aberto' },
              { id: 'finalizada', label: 'Concluídas' },
              { id: 'cancelada', label: 'Canceladas' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filtro === f.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {/* Lista de Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <p className="text-slate-500">Nenhuma viagem encontrada neste filtro.</p>
            </div>
          ) : (
            rides.map((ride) => (
              <div key={ride.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-colors">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                      <p className="text-sm font-medium text-slate-200 leading-tight">{ride.origem}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-rose-500" />
                      <p className="text-sm font-medium text-slate-200 leading-tight">{ride.destino}</p>
                    </div>
                  </div>
                  {renderBadgeStatus(ride.status)}
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-white/5">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">
                    {new Date(ride.created_at).toLocaleDateString('pt-BR')} • {new Date(ride.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total</p>
                    <p className={`text-lg font-black ${ride.status === 'cancelada' ? 'line-through text-slate-600' : 'text-white'}`}>
                      {ride.preco_final ? formatarMoeda(ride.preco_final) : formatarMoeda(ride.preco_estimado)}
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