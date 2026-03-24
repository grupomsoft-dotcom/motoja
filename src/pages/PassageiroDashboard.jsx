import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapPin, Navigation, Bike, Clock, Loader2, CheckCircle2, LogOut } from 'lucide-react'

// CORREÇÃO DEFINITIVA PARA VERCEL: Usando links diretos (CDN) para evitar erro de build
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const iconPassageiro = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35], 
  iconAnchor: [17, 35]
})

const iconMoto = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [45, 45], 
  iconAnchor: [22, 45]
})

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function PassageiroDashboard() {
  const { session, signOut, loading: authLoading } = useAuth()
  const [etapa, setEtapa] = useState('solicitar')
  const [destino, setDestino] = useState('')
  const [origem, setOrigem] = useState('Minha Localização Atual')
  const [precoEstimado, setPrecoEstimado] = useState(0)
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [posMotorista, setPosMotorista] = useState(null)
  const [loading, setLoading] = useState(false)

  // 1. Trava de carregamento inicial
  if (authLoading) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500 mb-2" size={40} />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Carregando Mapa...</p>
      </div>
    )
  }

  if (!session) return null;

  // 2. Cálculo de preço simplificado
  useEffect(() => {
    if (destino.length > 5) {
      const calculo = 5.00 + (destino.length * 0.15)
      setPrecoEstimado(calculo > 30 ? 30 : calculo)
    }
  }, [destino])

  // 3. Solicitar Corrida
  const solicitarMoto = async () => {
    if (!destino) return;
    setLoading(true)
    const { data, error } = await supabase
      .from('rides')
      .insert([{
        passageiro_id: session.user.id,
        origem,
        destino,
        preco_estimado: precoEstimado,
        status: 'solicitada',
        origem_lat: -23.5505, 
        origem_lng: -46.6333
      }])
      .select().single()

    if (!error) {
      setCorridaAtiva(data)
      setEtapa('aguardando')
    } else {
      alert("Erro ao solicitar: Verifique se a tabela 'rides' existe no Supabase.")
    }
    setLoading(false)
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden relative">
      {/* HEADER */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex justify-between items-center pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-white/5 pointer-events-auto shadow-xl">
             <div className="flex items-center gap-3 px-2">
                 <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
                     <Bike size={16} className="text-white" />
                 </div>
                 <span className="text-white font-black text-xs uppercase tracking-widest">MotoJá</span>
             </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-white/5 text-slate-400 hover:text-rose-500 transition-colors pointer-events-auto shadow-xl"
          >
            <LogOut size={18} />
          </button>
      </div>

      {/* MAPA */}
      <div className="flex-1 relative z-0">
        <MapContainer 
            center={[-23.5505, -46.6333]} 
            zoom={15} 
            zoomControl={false} 
            className="h-full w-full"
        >
          <ChangeView center={posMotorista || [-23.5505, -46.6333]} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={[-23.5505, -46.6333]} icon={iconPassageiro} />
          {posMotorista && <Marker position={posMotorista} icon={iconMoto} />}
        </MapContainer>
      </div>

      {/* PAINEL INFERIOR */}
      <div className="bg-slate-800 rounded-t-[2.5rem] p-6 pb-10 shadow-2xl border-t border-white/5 z-10">
        <div className="max-w-md mx-auto">
          {etapa === 'solicitar' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-5">
              <div className="space-y-2">
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
                  <Navigation size={18} className="text-indigo-400" />
                  <input className="bg-transparent border-none text-white text-sm w-full outline-none" value={origem} readOnly />
                </div>
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-indigo-500/30">
                  <MapPin size={18} className="text-emerald-400" />
                  <input 
                    className="bg-transparent border-none text-white text-sm w-full outline-none" 
                    placeholder="Para onde vamos?" 
                    value={destino} 
                    onChange={(e) => setDestino(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                <span className="text-indigo-200 text-xs font-bold uppercase">Estimativa</span>
                <span className="text-white font-black text-xl">R$ {precoEstimado.toFixed(2)}</span>
              </div>
              <button 
                disabled={!destino || loading}
                onClick={solicitarMoto}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'CONFIRMAR MOTO'}
              </button>
            </div>
          )}
          {/* Outras etapas (aguardando/em_rota) permanecem iguais... */}
        </div>
      </div>
    </div>
  )
}