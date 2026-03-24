import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Bike, MapPin, Send, MessageCircle, X, Navigation, Loader2 } from 'lucide-react'

// Configuração de ícones personalizados
const iconPassageiro = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/711/711768.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35]
})

const iconMoto = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
})

function LocationMarker({ onLocationFound }) {
  const map = useMapEvents({
    click(e) {
      onLocationFound([e.latlng.lat, e.latlng.lng])
      map.flyTo(e.latlng, map.getZoom())
    },
  })
  return null
}

export default function PassageiroDashboard() {
  const { session } = useAuth()
  const [position, setPosition] = useState(null)
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [loading, setLoading] = useState(false)
  const [rideAtiva, setRideAtiva] = useState(null)
  const [motoristaPos, setMotoristaPos] = useState(null)

  // 1. Localização inicial
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition([-6.0723, -49.9089]) // Fallback
    )
  }, [])

  // 2. Ouvir mudanças na corrida e localização do motorista
  useEffect(() => {
    if (!session?.user?.id) return

    const channel = supabase
      .channel(`ride_passageiro_${session.user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'rides',
        filter: `passageiro_id=eq.${session.user.id}`
      }, async (payload) => {
        const ride = payload.new
        setRideAtiva(ride)

        // Se aceitou, buscar dados do motorista
        if (ride.status === 'aceita' && ride.motorista_id) {
          const { data: mot } = await supabase
            .from('profiles') // Assumindo que você tem uma tabela profiles
            .select('nome, telefone')
            .eq('id', ride.motorista_id)
            .single()
          
          setRideAtiva(prev => ({ ...prev, motorista: mot }))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  // 3. Listener para posição da Moto (tabela motorista_localizacoes)
  useEffect(() => {
    if (rideAtiva?.status !== 'aceita' || !rideAtiva?.motorista_id) return

    const channelLoc = supabase
      .channel(`loc_motorista_${rideAtiva.motorista_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'motorista_localizacoes',
        filter: `motorista_id=eq.${rideAtiva.motorista_id}`
      }, (payload) => {
        setMotoristaPos([payload.new.lat, payload.new.lng])
      })
      .subscribe()

    return () => supabase.removeChannel(channelLoc)
  }, [rideAtiva])

  const solicitarMoto = async () => {
    if (!origem || !destino) return alert('Defina os endereços!')
    setLoading(true)

    const { data, error } = await supabase
      .from('rides')
      .insert({
        passageiro_id: session.user.id,
        origem,
        destino,
        origem_lat: position[0],
        origem_lng: position[1],
        preco_estimado: 12.00, // Aqui você pode calcular baseado na distância
        status: 'solicitada'
      })
      .select().single()

    if (error) alert(error.message)
    else setRideAtiva(data)
    setLoading(false)
  }

  if (!position) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* MAPA FULLSCREEN */}
      <div className="fixed inset-0 z-0">
        <MapContainer center={position} zoom={15} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={position} icon={iconPassageiro} />
          {motoristaPos && <Marker position={motoristaPos} icon={iconMoto} />}
          <LocationMarker onLocationFound={setPosition} />
          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>

      {/* INTERFACE SOBREPOSTA */}
      <div className="relative z-10 p-4 flex flex-col h-screen justify-between pointer-events-none">
        <header className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 pointer-events-auto shadow-2xl">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Bike className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">MotoJá</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Passageiro</p>
          </div>
        </header>

        <div className="space-y-4 pointer-events-auto">
          {/* Card de Notificação/Motorista */}
          {rideAtiva?.status === 'aceita' && (
            <div className="bg-emerald-600 p-5 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">MOTORISTA A CAMINHO</span>
                <button onClick={() => setRideAtiva(null)}><X size={18} /></button>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                   <Bike size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{rideAtiva.motorista?.nome || 'Motorista Parceiro'}</h3>
                  <p className="text-xs opacity-80">Chega em instantes • R${rideAtiva.preco_estimado}</p>
                </div>
                <a 
                  href={`https://wa.me/${rideAtiva.motorista?.telefone}`}
                  className="bg-white text-emerald-600 p-3 rounded-2xl hover:scale-110 transition-transform"
                >
                  <MessageCircle size={24} />
                </a>
              </div>
            </div>
          )}

          {/* Card de Solicitação */}
          {!rideAtiva && (
            <div className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-emerald-500 w-4 h-4" />
                  <input
                    placeholder="Onde você está?"
                    value={origem}
                    onChange={e => setOrigem(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-2xl text-sm border border-white/5 focus:border-emerald-500 transition-all outline-none"
                  />
                </div>
                <div className="relative">
                  <Navigation className="absolute left-4 top-4 text-indigo-500 w-4 h-4" />
                  <input
                    placeholder="Para onde vamos?"
                    value={destino}
                    onChange={e => setDestino(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-2xl text-sm border border-white/5 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                onClick={solicitarMoto}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0f172a] font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> CHAMAR MOTO</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}