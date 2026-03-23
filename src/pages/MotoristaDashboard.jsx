import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Bike, RefreshCcw, CheckCircle2, Flag } from 'lucide-react'

export default function MotoristaDashboard() {
  const { session } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(null)
  const [finishing, setFinishing] = useState(null)
  const [precoFinal, setPrecoFinal] = useState('')

  // Enviar localização do motorista em tempo (quase) real
  useEffect(() => {
    if (!session) return

    if (!('geolocation' in navigator)) {
      console.warn('Geolocalização não suportada neste navegador.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          await supabase
            .from('motorista_localizacoes')
            .upsert({
              motorista_id: session.user.id,
              lat: latitude,
              lng: longitude,
            })
        } catch (err) {
          console.error('Erro ao enviar localização do motorista:', err)
        }
      },
      (err) => {
        console.error('Erro GPS motorista:', err)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [session])

  const fetchRides = async () => {
    if (!session) return
    setLoading(true)

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .in('status', ['solicitada', 'aceita'])
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      alert('Erro ao carregar corridas: ' + error.message)
    } else {
      setRides(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchRides()

    const channel = supabase
      .channel('public:rides-motorista')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload) => {
          const newRow = payload.new
          if (!newRow) return

          if (['solicitada', 'aceita'].includes(newRow.status)) {
            setRides((current) => {
              const exists = current.find((r) => r.id === newRow.id)
              if (exists) {
                return current.map((r) => (r.id === newRow.id ? newRow : r))
              }
              return [newRow, ...current]
            })
          } else {
            setRides((current) => current.filter((r) => r.id !== newRow.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  const aceitarCorrida = async (rideId) => {
    if (!session) {
      alert('Sessão expirada, faça login novamente.')
      return
    }

    setAccepting(rideId)
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'aceita',
        motorista_id: session.user.id,
      })
      .eq('id', rideId)

    setAccepting(null)

    if (error) {
      alert('Erro ao aceitar corrida: ' + error.message)
    } else {
      alert('Corrida aceita!')
      fetchRides()
    }
  }

  const finalizarCorrida = async (rideId) => {
    if (!precoFinal) {
      alert('Informe o preço final da corrida.')
      return
    }

    const valor = Number(precoFinal.replace(',', '.'))
    if (isNaN(valor)) {
      alert('Preço final inválido.')
      return
    }

    setFinishing(rideId)
    const { error } = await supabase
      .from('rides')
      .update({
        status: 'finalizada',
        preco_final: valor,
      })
      .eq('id', rideId)

    setFinishing(null)

    if (error) {
      alert('Erro ao finalizar corrida: ' + error.message)
    } else {
      alert('Corrida finalizada com sucesso!')
      setPrecoFinal('')
      fetchRides()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-500 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center space-x-4">
          <Bike className="w-12 h-12 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">Motorista</h1>
            <p className="text-white/90">Veja, aceite e finalize corridas</p>
          </div>
        </header>

        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 flex items-center justify-between">
          <div>
            <p className="text-white/90">
              Corridas em aberto (solicitadas ou aceitas)
            </p>
            <p className="text-white text-sm opacity-80">
              Localização sendo enviada em tempo real.
            </p>
          </div>
          <button
            onClick={fetchRides}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-2xl"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Atualizar</span>
          </button>
        </div>

        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
          {loading ? (
            <p className="text-white">Carregando corridas...</p>
          ) : rides.length === 0 ? (
            <p className="text-white">Nenhuma corrida em aberto no momento.</p>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white/30 p-4 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">
                        {ride.origem} → {ride.destino}
                      </p>
                      <p className="text-white/90 text-sm">
                        Estimativa: R${ride.preco_estimado} | Status:{' '}
                        {ride.status}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 items-center">
                    {ride.status === 'solicitada' && (
                      <button
                        onClick={() => aceitarCorrida(ride.id)}
                        disabled={accepting === ride.id}
                        className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-2xl disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>
                          {accepting === ride.id
                            ? 'Aceitando...'
                            : 'Aceitar corrida'}
                        </span>
                      </button>
                    )}

                    {ride.status === 'aceita' && (
                      <>
                        <input
                          type="text"
                          placeholder="Preço final (ex: 18,50)"
                          value={precoFinal}
                          onChange={(e) => setPrecoFinal(e.target.value)}
                          className="w-full p-2 bg-white/40 rounded-xl text-white placeholder-white/70 border border-white/40"
                        />
                        <button
                          onClick={() => finalizarCorrida(ride.id)}
                          disabled={finishing === ride.id}
                          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-2xl disabled:opacity-60"
                        >
                          <Flag className="w-5 h-5" />
                          <span>
                            {finishing === ride.id
                              ? 'Finalizando...'
                              : 'Finalizar corrida'}
                          </span>
                        </button>
                      </>
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
