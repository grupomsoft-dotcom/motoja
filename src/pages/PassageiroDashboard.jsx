import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapPin, Navigation, Bike, Clock, DollarSign, Loader2, CheckCircle2 } from 'lucide-react'

// Ícones Customizados
const iconPassageiro = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35], iconAnchor: [17, 35]
})

const iconMoto = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [45, 45], iconAnchor: [22, 45]
})

export default function PassageiroDashboard() {
  const { session } = useAuth()
  const [etapa, setEtapa] = useState('solicitar') // solicitar | aguardando | em_rota
  const [destino, setDestino] = useState('')
  const [origem, setOrigem] = useState('Minha Localização Atual')
  const [precoEstimado, setPrecoEstimado] = useState(0)
  const [corridaAtiva, setCorridaAtiva] = useState(null)
  const [posMotorista, setPosMotorista] = useState(null)
  const [loading, setLoading] = useState(false)

  // 1. Lógica de Cálculo de Preço (Simulada por distância de texto para o MVP)
  useEffect(() => {
    if (destino.length > 5) {
      // Regra: R$ 5,00 base + R$ 2,00 por "complexidade" do endereço (exemplo)
      const calculo = 5.00 + (destino.length * 0.15)
      setPrecoEstimado(calculo > 30 ? 30 : calculo)
    }
  }, [destino])

  // 2. Realtime: Ouvir mudanças na MINHA corrida
  useEffect(() => {
    if (!session?.user?.id) return

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
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [session])

  // 3. Rastrear posição do motorista em tempo real
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
        .subscribe()

      return () => supabase.removeChannel(motoristaChannel)
    }
  }, [corridaAtiva, etapa])

  // 4. Solicitar Corrida
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
        origem_lat: -23.5505, // Exemplo: Pegar via Geolocation no futuro
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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* AREA DO MAPA */}
      <div className="flex-1 relative min-h-[300px]">
        <MapContainer center={[-23.5505, -46.6333]} zoom={15} zoomControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          
          {/* Marcador do Passageiro */}
          <Marker position={[-23.5505, -46.6333]} icon={iconPassageiro} />

          {/* Marcador da Moto (Aparece quando aceita) */}
          {posMotorista && (
            <Marker position={posMotorista} icon={iconMoto} />
          )}
        </MapContainer>

        {/* Overlay de Status Flutuante */}
        {etapa === 'aguardando' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-orange-500 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <Clock size={16} />
            <span className="text-xs font-bold uppercase tracking-tighter">Procurando Moto...</span>
          </div>
        )}
      </div>

      {/* PAINEL DE CONTROLE (BOTTOM SHEET STYLE) */}
      <div className="bg-slate-800 rounded-t-[2.5rem] p-8 shadow-2xl border-t border-white/5">
        <div className="max-w-md mx-auto">
          
          {etapa === 'solicitar' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Bike className="text-indigo-500" /> Para onde vamos?
              </h2>
              
              <div className="space-y-2">
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-white/5">
                  <Navigation size={18} className="text-indigo-400" />
                  <input 
                    className="bg-transparent border-none text-white text-sm focus:ring-0 w-full"
                    placeholder="Sua localização..."
                    value={origem}
                    readOnly
                  />
                </div>
                <div className="bg-slate-700/50 p-4 rounded-2xl flex items-center gap-3 border border-indigo-500/30">
                  <MapPin size={18} className="text-emerald-400" />
                  <input 
                    className="bg-transparent border-none text-white text-sm focus:ring-0 w-full"
                    placeholder="Digite o destino..."
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className="text-indigo-400" />
                  <span className="text-white font-bold">Valor Estimado</span>
                </div>
                <span className="text-white font-black text-xl">R$ {precoEstimado.toFixed(2)}</span>
              </div>

              <button 
                disabled={!destino || loading}
                onClick={solicitarMoto}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'SOLICITAR MOTO AGORA'}
              </button>
            </div>
          )}

          {etapa === 'em_rota' && (
            <div className="text-center space-y-4 animate-in zoom-in-95">
              <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="text-emerald-500" size={32} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg uppercase">Motorista a Caminho!</h3>
                <p className="text-slate-400 text-xs">O seu piloto aceitou a corrida e já está se deslocando.</p>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-2xl text-left border border-white/5">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Destino Final</p>
                <p className="text-white font-bold">{corridaAtiva?.destino}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}