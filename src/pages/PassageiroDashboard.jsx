import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapPin, Navigation, Bike, Clock, Loader2, CheckCircle2, LogOut } from 'lucide-react'

// 1. CORREÇÃO DEFINITIVA PARA VERCEL (Ícones via CDN)
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

// Sub-componente para centralizar o mapa dinamicamente
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function PassageiroDashboard() {
  const { session, signOut, loading: authLoading } = useAuth()
  const [etapa, setEtapa] = useState('solicitar')
  const [destino, setDestino] = useState('')
  const [origem, setOrigem] = useState('Buscando localização...')
  const [minhaPosicao, setMinhaPosicao] = useState(null)
  
  const [precoEstimado, setPrecoEstimado] = useState(0)
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [posMotorista, setPosMotorista] = useState(null)
  const [loading, setLoading] = useState(false)

  // 2. CAPTURAR GPS REAL DO USUÁRIO
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMinhaPosicao([latitude, longitude]);
          setOrigem("Minha Localização Atual");
        },
        (error) => {
          console.error("Erro GPS:", error);
          setMinhaPosicao([-23.5505, -46.6333]); // Fallback SP
          setOrigem("GPS não permitido");
        }
      );
    }
  }, []);

  // 3. CÁLCULO DE PREÇO (SIMULADO)
  useEffect(() => {
    if (destino.length > 3) {
      const calculo = 5.00 + (destino.length * 0.20)
      setPrecoEstimado(calculo > 40 ? 40 : calculo)
    }
  }, [destino])

  // 4. REALTIME: MONITORAR STATUS DA MINHA CORRIDA
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`vagas_rides_${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rides', filter: `passageiro_id=eq.${session.user.id}` },
        (payload) => {
          setCorridaAtiva(payload.new)
          if (payload.new.status === 'aceita') setEtapa('em_rota')
          if (payload.new.status === 'finalizada') {
            alert("Corrida finalizada! Obrigado por usar MotoJá.")
            setEtapa('solicitar')
            setCorridaAtiva(null)
            setDestino('')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  // 5. SOLICITAR MOTO
  const solicitarMoto = async () => {
    if (!destino || !minhaPosicao) return;
    setLoading(true)
    const { data, error } = await supabase
      .from('rides')
      .insert([{
        passageiro_id: session.user.id,
        origem,
        destino,
        preco_estimado: precoEstimado,
        status: 'solicitada',
        origem_lat: minhaPosicao[0], 
        origem_lng: minhaPosicao[1]
      }])
      .select().single()

    if (!error) {
      setCorridaAtiva(data)
      setEtapa('aguardando')
    } else {
      alert("Erro ao solicitar corrida. Verifique a conexão.")
    }
    setLoading(false)
  }

  if (authLoading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
      <p className="font-bold tracking-widest uppercase text-xs">Carregando MotoJá...</p>
    </div>
  );

  if (!session) return null;

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden relative">
      
      {/* HEADER FLUTUANTE */}
      <div className="absolute top-4 left-4 right-4 z-[1001] flex justify-between items-center pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur-md p-2 rounded-2xl border border-white/5 pointer-events-auto shadow-2xl">
             <div className="flex items-center gap-3 px-2">
                 <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                     <Bike size={16} className="text-white" />
                 </div>
                 <span className="text-white font-black text-xs uppercase tracking-widest">MotoJá</span>
             </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl border border-white/5 text-slate-400 hover:text-rose-500 transition-all pointer-events-auto shadow-2xl"
          >
            <LogOut size={18} />
          </button>
      </div>

      {/* ÁREA DO MAPA */}
      <div className="flex-1 relative z-0">
        {minhaPosicao ? (
            <MapContainer center={minhaPosicao} zoom={15} zoomControl={false} className="h-full w-full">
              <ChangeView center={posMotorista || minhaPosicao} />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <Marker position={minhaPosicao} icon={iconPassageiro} />
              {posMotorista && <Marker position={posMotorista} icon={iconMoto} />}
            </MapContainer>
        ) : (
            <div className="h-full w-full bg-slate-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-700" size={30} />
            </div>
        )}

        {etapa === 'aguardando' && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <Clock size={16} />
            <span className="text-xs font-black uppercase tracking-tighter">Procurando Piloto...</span>
          </div>
        )}
      </div>

      {/* PAINEL INFERIOR (CONTROLES) */}
      <div className="bg-slate-800 rounded-t-[2.5rem] p-6 pb-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/5 z-10">
        <div className="max-w-md mx-auto">
          
          {etapa === 'solicitar' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
              <div className="space-y-2">
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
                  <Navigation size={18} className="text-indigo-400 flex-shrink-0" />
                  <input className="bg-transparent border-none text-white text-sm w-full outline-none cursor-default" value={origem} readOnly />
                </div>
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-indigo-500/30 ring-1 ring-indigo-500/20">
                  <MapPin size={18} className="text-emerald-400 flex-shrink-0" />
                  <input 
                    className="bg-transparent border-none text-white text-sm w-full outline-none placeholder:text-slate-500" 
                    placeholder="Para onde você quer ir?" 
                    value={destino} 
                    onChange={(e) => setDestino(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                <span className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Valor Estimado</span>
                <span className="text-white font-black text-2xl">R$ {precoEstimado.toFixed(2)}</span>
              </div>

              <button 
                disabled={!destino || loading || !minhaPosicao}
                onClick={solicitarMoto}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'CHAMAR MOTOJÁ'}
              </button>
            </div>
          )}

          {etapa === 'aguardando' && (
              <div className="py-8 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 animate-pulse" />
                      <Loader2 size={64} className="text-orange-500 animate-spin" />
                  </div>
                  <p className="text-white font-bold italic">O piloto mais próximo está sendo notificado...</p>
                  <button 
                    onClick={() => setEtapa('solicitar')}
                    className="text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-rose-500 transition-colors"
                  >
                    Cancelar Corrida
                  </button>
              </div>
          )}

          {etapa === 'em_rota' && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-center gap-4">
                  <div className="bg-emerald-500/20 p-3 rounded-full">
                    <CheckCircle2 className="text-emerald-500" size={28} />
                  </div>
                  <div className="text-left">
                      <h3 className="text-white font-black text-xl uppercase tracking-tighter leading-none">Piloto Aceitou!</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase">Ele já está a caminho</p>
                  </div>
              </div>
              
              <div className="p-5 bg-slate-900/80 rounded-3xl border border-white/5 flex justify-between items-center shadow-inner">
                  <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Seu Destino</p>
                      <p className="text-white font-bold text-sm truncate max-w-[180px]">{corridaAtiva?.destino}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Pagamento</p>
                      <p className="text-emerald-400 font-black text-lg">R$ {corridaAtiva?.preco_estimado?.toFixed(2)}</p>
                  </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}