import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapPin, Navigation, Bike, Clock, DollarSign, Loader2, CheckCircle2, LogOut } from 'lucide-react'

// FIX: Corrigindo o problema de ícones do Leaflet que somem no Build/Vercel
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Ícones Customizados com fallback caso a URL externa falhe
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

// Sub-componente para garantir que o mapa se ajuste ao tamanho da tela
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center);
  return null;
}

export default function PassageiroDashboard() {
  const { session, signOut } = useAuth() // Adicionei signOut aqui
  const [etapa, setEtapa] = useState('solicitar')
  const [destino, setDestino] = useState('')
  const [origem, setOrigem] = useState('Minha Localização Atual')
  const [precoEstimado, setPrecoEstimado] = useState(0)
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [posMotorista, setPosMotorista] = useState(null)
  const [loading, setLoading] = useState(false)

  // Trava de segurança para evitar erro de "role" undefined
  if (!session) return null;

  useEffect(() => {
    if (destino.length > 5) {
      const calculo = 5.00 + (destino.length * 0.15)
      setPrecoEstimado(calculo > 30 ? 30 : calculo)
    }
  }, [destino])

  // Realtime: Minha Corrida
  useEffect(() => {
    const channel = supabase
      .channel(`minha_corrida_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `passageiro_id=eq.${session.user.id}` },
        (payload) => {
          setCorridaAtiva(payload.new)
          if (payload.new.status === 'aceita') setEtapa('em_rota')
          if (payload.new.status === 'finalizada') {
            alert("Você chegou ao seu destino!")
            setEtapa('solicitar')
            setCorridaAtiva(null)
            setDestino('')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  // Rastrear Motorista
  useEffect(() => {
    if (corridaAtiva?.motorista_id && etapa === 'em_rota') {
      const motoristaChannel = supabase
        .channel(`pos_motorista_${corridaAtiva.motorista_id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'motorista_localizacoes', filter: `motorista_id=eq.${corridaAtiva.motorista_id}` },
          (payload) => {
            setPosMotorista([payload.new.lat, payload.new.lng])
          }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'motorista_localizacoes', filter: `motorista_id=eq.${corridaAtiva.motorista_id}` },
            (payload) => {
              setPosMotorista([payload.new.lat, payload.new.lng])
            }
          )
        .subscribe()

      return () => { supabase.removeChannel(motoristaChannel) }
    }
  }, [corridaAtiva, etapa])

  const solicitarMoto = async () => {
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
    }
    setLoading(false)
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* HEADER COMPACTO */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex justify-between items-center pointer-events-none">
         <div className="bg-slate-800/80 backdrop-blur-md p-2 rounded-2xl border border-white/5 pointer-events-auto">
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <Bike size={16} className="text-white" />
                </div>
                <span className="text-white font-black text-xs uppercase tracking-widest">MotoJá</span>
            </div>
         </div>
         <button 
            onClick={() => signOut()}
            className="bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl border border-white/5 text-slate-400 hover:text-rose-500 transition-colors pointer-events-auto"
         >
            <LogOut size={18} />
         </button>
      </div>

      {/* AREA DO MAPA */}
      <div className="flex-1 relative">
        <MapContainer 
            center={[-23.5505, -46.6333]} 
            zoom={15} 
            zoomControl={false} 
            className="h-full w-full z-0"
        >
          <ChangeView center={posMotorista || [-23.5505, -46.6333]} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          
          <Marker position={[-23.5505, -46.6333]} icon={iconPassageiro} />

          {posMotorista && (
            <Marker position={posMotorista} icon={iconMoto} />
          )}
        </MapContainer>

        {etapa === 'aguardando' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <Clock size={16} />
            <span className="text-xs font-black uppercase tracking-tighter">Procurando Piloto...</span>
          </div>
        )}
      </div>

      {/* PAINEL DE CONTROLE */}
      <div className="bg-slate-800 rounded-t-[2.5rem] p-6 pb-10 shadow-2xl border-t border-white/5 z-10">
        <div className="max-w-md mx-auto">
          
          {etapa === 'solicitar' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-5">
              <div className="space-y-2">
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
                  <Navigation size={18} className="text-indigo-400 flex-shrink-0" />
                  <input className="bg-transparent border-none text-white text-sm focus:ring-0 w-full" value={origem} readOnly />
                </div>
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-indigo-500/30">
                  <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                  <input 
                    className="bg-transparent border-none text-white text-sm focus:ring-0 w-full" 
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
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'CONFIRMAR MOTO'}
              </button>
            </div>
          )}

          {etapa === 'aguardando' && (
              <div className="py-6 text-center space-y-4 animate-in fade-in">
                  <div className="flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-orange-500 blur-xl opacity-20 animate-pulse" />
                        <Loader2 size={48} className="text-orange-500 animate-spin relative" />
                    </div>
                  </div>
                  <p className="text-white font-bold italic">Buscando o piloto mais próximo...</p>
                  <button 
                    onClick={() => setEtapa('solicitar')}
                    className="text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Cancelar Solicitação
                  </button>
              </div>
          )}

          {etapa === 'em_rota' && (
            <div className="text-center space-y-4 animate-in zoom-in-95">
              <div className="bg-emerald-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-emerald-500" size={24} />
              </div>
              <h3 className="text-white font-black text-lg uppercase tracking-tighter">Piloto a Caminho!</h3>
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center text-left">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Destino</p>
                        <p className="text-white font-bold text-sm truncate max-w-[200px]">{corridaAtiva?.destino}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Pagamento</p>
                        <p className="text-emerald-400 font-black">R$ {corridaAtiva?.preco_estimado?.toFixed(2)}</p>
                    </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}