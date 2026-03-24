import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Navigation, Loader2, Map as MapIcon, AlertTriangle } from 'lucide-react'

// Corrigir ícones padrão do Leaflet que às vezes somem no build
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Ícones Personalizados MotoJá
const iconMoto = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [45, 45],
  iconAnchor: [22, 45],
})

const iconPassageiro = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
})

// Componente para centralizar o mapa suavemente
function RecenterMap({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, map.getZoom(), { animate: true, duration: 1.5 })
    }
  }, [coords, map])
  return null
}

export default function MapaMotorista({ corrida }) {
  const [minhaPos, setMinhaPos] = useState(null)
  const [erroGps, setErroGps] = useState(null)

  // Função para lidar com a posição encontrada
  const handleSuccess = useCallback((pos) => {
    const { latitude, longitude } = pos.coords
    setMinhaPos([latitude, longitude])
    setErroGps(null)
  }, [])

  // Função para lidar com erros de GPS (Timeout, Permissão, etc)
  const handleError = useCallback((err) => {
    console.warn(`Erro GPS (${err.code}): ${err.message}`)
    setErroGps(err.code)
    
    // Se der timeout (code 3), tenta uma vez sem alta precisão (mais rápido em desktops)
    if (err.code === 3) {
      navigator.geolocation.getCurrentPosition(handleSuccess, null, {
        enableHighAccuracy: false,
        timeout: 5000
      })
    }
  }, [handleSuccess])

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, // Tenta GPS primeiro
      maximumAge: 5000,
      timeout: 10000 // 10 segundos antes de dar erro 3
    })

    return () => navigator.geolocation.clearWatch(watchId)
  }, [handleSuccess, handleError])

  const posPassageiro = corrida?.origem_lat && corrida?.origem_lng 
    ? [corrida.origem_lat, corrida.origem_lng] 
    : null

  // Tela de Carregamento ou Erro
  if (!minhaPos) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-900/90 gap-4 p-6 text-center">
        {erroGps === 3 ? (
          <>
            <AlertTriangle className="w-10 h-10 text-yellow-500 animate-pulse" />
            <p className="text-white font-bold text-sm uppercase">Sinal de GPS Fraco</p>
            <p className="text-slate-400 text-xs">Tente mover o dispositivo ou use uma rede Wi-Fi.</p>
          </>
        ) : (
          <>
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-white font-bold text-sm uppercase">Sincronizando Localização...</p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
      <MapContainer 
        center={minhaPos} 
        zoom={16} 
        zoomControl={false} 
        className="h-full w-full z-0"
      >
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          attribution='&copy; CARTO'
        />
        
        <Marker position={minhaPos} icon={iconMoto} />

        {posPassageiro && (
          <>
            <Marker position={posPassageiro} icon={iconPassageiro} />
            <Polyline 
              positions={[minhaPos, posPassageiro]} 
              pathOptions={{
                color: '#6366f1', 
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 15',
                lineJoin: 'round'
              }}
            />
            <RecenterMap coords={minhaPos} />
          </>
        )}

        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Indicadores de Status */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2 pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl flex items-center gap-2 shadow-xl">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">
            {corrida ? 'Rota Ativa' : 'Aguardando Chamadas'}
          </span>
        </div>
      </div>

      {/* Overlay de Vinheta (Estético) */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,0.4)] z-[999]"></div>
    </div>
  )
}