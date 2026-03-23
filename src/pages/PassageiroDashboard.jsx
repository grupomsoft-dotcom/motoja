import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Truck, MapPin, Send } from 'lucide-react'

// Ajuste ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function LocationMarker({ onClick }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function PassageiroDashboard() {
  const { session } = useAuth()
  const [position, setPosition] = useState(null)
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [rides, setRides] = useState([])
  const [notificacao, setNotificacao] = useState(null)
  const [motoristaPos, setMotoristaPos] = useState(null)
  const [motoristaIdAtual, setMotoristaIdAtual] = useState(null)

  // Geolocalização inicial do passageiro
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition([-6.0723, -49.9089]) // Parauapebas fallback
    )
  }, [])

  // Listener Realtime para mudanças nas corridas do passageiro
  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('passageiro-rides-' + session.user.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides' },
        async (payload) => {
          const ride = payload.new
          if (!ride) return

          // Só corridas deste passageiro
          if (ride.passageiro_id !== session.user.id) return

          // Quando o motorista ACEITAR a corrida
          if (ride.status === 'aceita') {
            let motoristaNome = null
            let motoristaTelefone = null

            if (ride.motorista_id) {
              const { data: motorista, error } = await supabase
                .from('users')
                .select('nome, telefone')
                .eq('id', ride.motorista_id)
                .single()

              if (!error && motorista) {
                motoristaNome = motorista.nome
                motoristaTelefone = motorista.telefone
              }
            }

            setNotificacao({
              origem: ride.origem,
              destino: ride.destino,
              preco_estimado: ride.preco_estimado,
              motorista_nome: motoristaNome,
              motorista_telefone: motoristaTelefone,
            })

            // comece a ouvir a localização deste motorista
            if (ride.motorista_id) {
              setMotoristaIdAtual(ride.motorista_id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  // Listener Realtime para localização do motorista atual
  useEffect(() => {
    if (!motoristaIdAtual) return

    const channel = supabase
      .channel('motorista-location-' + motoristaIdAtual)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motorista_localizacoes',
          filter: `motorista_id=eq.${motoristaIdAtual}`,
        },
        (payload) => {
          const loc = payload.new
          if (!loc) return
          setMotoristaPos([loc.lat, loc.lng])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [motoristaIdAtual])

  const solicitarMoto = async () => {
    if (!session) {
      alert('Sessão expirada, faça login novamente.')
      return
    }

    if (!origem || !destino) {
      alert('Preencha origem e destino!')
      return
    }
    if (!position) {
      alert('Ainda localizando sua posição...')
      return
    }

    const { data, error } = await supabase
      .from('rides')
      .insert({
        passageiro_id: session.user.id,
        origem,
        destino,
        origem_lat: position[0],
        origem_lng: position[1],
        preco_estimado: 15.5,
        status: 'solicitada',
      })
      .select()
      .single()

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      alert('Moto solicitada! ID: ' + data.id)
      setRides([data, ...rides])
      setOrigem('')
      setDestino('')
      setMotoristaPos(null)
      setMotoristaIdAtual(null)
      setNotificacao(null)
    }
  }

  if (!position) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600">
        <div className="text-white text-xl">Localizando você no mapa...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-600 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center space-x-4">
          <Truck className="w-12 h-12 text-white" />
          <div>
            <h1 className="text-3xl font-bold text-white">Passageiro</h1>
            <p className="text-white/90">Solicite sua moto-táxi</p>
          </div>
        </header>

        {/* Notificação quando motorista aceita */}
        {notificacao && (
          <div className="bg-emerald-600/90 border border-white/40 text-white rounded-2xl p-4 flex items-start justify-between shadow-xl">
            <div>
              <p className="font-bold text-sm mb-1">Moto aceita! 🚀</p>
              <p className="text-sm">
                Sua corrida {notificacao.origem} → {notificacao.destino} foi
                aceita.
              </p>
              {notificacao.preco_estimado && (
                <p className="text-xs mt-1 opacity-90">
                  Preço estimado: R${notificacao.preco_estimado}
                </p>
              )}
              {notificacao.motorista_nome && (
                <p className="text-xs mt-1">
                  Motorista: {notificacao.motorista_nome}{' '}
                  {notificacao.motorista_telefone &&
                    `— ${notificacao.motorista_telefone}`}
                </p>
              )}
            </div>
            <button
              onClick={() => setNotificacao(null)}
              className="ml-4 text-xs hover:text-gray-200"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Mapa */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <MapPin className="w-6 h-6 mr-2" /> Clique no mapa para definir a
            origem
          </h2>
          <MapContainer
            center={position}
            zoom={15}
            className="h-96 rounded-2xl shadow-2xl"
            style={{ height: '400px' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {/* Marcador do passageiro */}
            <Marker position={position} />
            <LocationMarker onClick={setPosition} />

            {/* Marcador da moto (motorista) */}
            {motoristaPos && <Marker position={motoristaPos} />}
          </MapContainer>
        </div>

        {/* Form de solicitação */}
        <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Origem (ex: Rua das Flores, 123)"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className="w-full p-4 bg-white/30 rounded-2xl text-white placeholder-white/70 border border-white/30 focus:border-white"
            />
            <input
              type="text"
              placeholder="Destino (ex: Centro)"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full p-4 bg-white/30 rounded-2xl text-white placeholder-white/70 border border-white/30 focus:border-white"
            />
            <button
              onClick={solicitarMoto}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center space-x-2 shadow-xl"
            >
              <Send className="w-6 h-6" />
              <span>Solicitar Moto - R$15,50</span>
            </button>
          </div>
        </div>

        {/* Corridas recentes simples */}
        {rides.length > 0 && (
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
            <h3 className="text-xl font-bold text-white mb-4">
              Corridas Recentes
            </h3>
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride.id} className="bg-white/30 p-4 rounded-2xl">
                  <p className="font-bold text-white">
                    {ride.origem} → {ride.destino}
                  </p>
                  <p className="text-white/90 text-sm">
                    Status: {ride.status} | R${ride.preco_estimado}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
