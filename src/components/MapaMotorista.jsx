import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Navigation, Loader2, Map as MapIcon } from 'lucide-react'

// 1. Configuração de Ícones Personalizados (Estilo MotoJá)
const iconMoto = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -40],
})

const iconPassageiro = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Pin de destino
  iconSize: [35, 35],
  iconAnchor: [17, 35],
})

// Componente para centralizar o mapa suavemente quando a posição muda
function RecenterMap({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, map.getZoom(), {
        animate: true,
        duration: 1.5
      })
    }
  }, [coords, map])
  return null
}

export default function MapaMotorista({ corrida }) {
  const [minhaPos, setMinhaPos] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  // 2. Rastreamento de GPS em Tempo Real
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocalização não suportada")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setMinhaPos([latitude, longitude])
      },
      (err) => console.error("Erro GPS:", err),
      { 
        enableHighAccuracy: true, 
        maximumAge: 1000, 
        timeout: 5000 
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Coordenadas do passageiro vindas da prop 'corrida'
  const posPassageiro = corrida?.origem_lat && corrida?.origem_lng 
    ? [corrida.origem_lat, corrida.origem_lng] 
    : null

  // 3. Estado de Carregamento (Loading)
  if (!minhaPos) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm gap-4 transition-all">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <Navigation className="w-4 h-4 text-white absolute rotate-45" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-sm tracking-widest uppercase">Sincronizando GPS</p>
          <p className="text-slate-400 text-[10px]">Aguardando sinal de satélite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative group overflow-hidden rounded-2xl border border-white/5">
      <MapContainer 
        center={minhaPos} 
        zoom={16} 
        zoomControl={false} 
        className="h-full w-full z-0"
        whenReady={() => setMapReady(true)}
      >
        {/* Camada Dark Mode Premium */}
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        
        {/* Marcador da Moto (Motorista) */}
        <Marker position={minhaPos} icon={iconMoto} />

        {/* Lógica de Corrida Ativa */}
        {posPassageiro && (
          <>
            <Marker position={posPassageiro} icon={iconPassageiro} />
            
            {/* Linha de Trajeto (Neon Style) */}
            <Polyline 
              positions={[minhaPos, posPassageiro]} 
              pathOptions={{
                color: '#6366f1', 
                weight: 5,
                opacity: 0.7,
                dashArray: '1, 12',
                lineCap: 'round'
              }}
            />
            
            <RecenterMap coords={minhaPos} />
          </>
        )}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* 4. UI Overlays (Indicadores de Status) */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none space-y-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl flex items-center gap-3 shadow-2xl">
          <div className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">
            {corrida ? 'Em Atendimento' : 'Online / Patrulhando'}
          </span>
        </div>

        {corrida && (
          <div className="bg-indigo-600/90 backdrop-blur-md border border-indigo-400/30 px-3 py-2 rounded-xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-left-2">
             <MapIcon size={14} className="text-white" />
             <span className="text-[10px] font-bold text-white uppercase">Rota Traçada</span>
          </div>
        )}
      </div>

      {/* Gradiente de profundidade nas bordas */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-[999]"></div>
    </div>
  )
}