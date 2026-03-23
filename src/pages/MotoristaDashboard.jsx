import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MapaMotorista from '../components/MapaMotorista'

export default function MotoristaDashboard() {
  const [corridaAtual, setCorridaAtual] = useState(null)
  const [status, setStatus] = useState('disponivel')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setLoading(true)
        setErro(null)

        // TODO: ajuste as tabelas/consultas conforme seu banco
        const { data, error } = await supabase
          .from('corridas')
          .select('*')
          .eq('status_motorista', 'em_andamento')
          .limit(1)
          .maybeSingle()

        if (error) throw error

        setCorridaAtual(data)
      } catch (e) {
        console.error(e)
        setErro('Erro ao carregar dados do motorista')
      } finally {
        setLoading(false)
      }
    }

    carregarDados()
  }, [])

  const iniciarCorrida = async () => {
    // sua lógica de iniciar corrida
  }

  const finalizarCorrida = async () => {
    // sua lógica de finalizar corrida
  }

  return (
    <div className="min-h-full bg-slate-900 text-slate-100">
      <div className="max-w-4xl mx-auto px-3 pt-3 pb-20 sm:px-4">
        {/* Card principal com status */}
        <section className="bg-slate-800/90 rounded-2xl shadow-lg p-4 sm:p-5 mb-3">
          <header className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">
                Painel do motorista
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Controle suas corridas em tempo real
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                status === 'disponivel'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
              }`}
            >
              {status === 'disponivel' ? 'Disponível' : 'Em corrida'}
            </span>
          </header>

          {erro && (
            <div className="mb-2 text-xs text-red-300 bg-red-500/10 border border-red-500/40 rounded-xl px-3 py-2">
              {erro}
            </div>
          )}

          {loading ? (
            <div className="py-4 text-center text-sm text-slate-300">
              Carregando dados...
            </div>
          ) : corridaAtual ? (
            <div className="space-y-2 text-sm sm:text-base">
              <div className="flex justify-between gap-2">
                <span className="text-slate-300">Passageiro:</span>
                <span className="font-semibold">
                  {corridaAtual.nome_passageiro || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-300">Origem:</span>
                <span className="font-semibold text-right">
                  {corridaAtual.origem || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-300">Destino:</span>
                <span className="font-semibold text-right">
                  {corridaAtual.destino || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-300">Forma de pagamento:</span>
                <span className="font-semibold">
                  {corridaAtual.pagamento || '—'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-slate-300">
              Nenhuma corrida em andamento no momento.
            </div>
          )}

          {/* Botões principais */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={iniciarCorrida}
              className="col-span-2 sm:col-span-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-semibold py-2.5 rounded-xl transition active:scale-[0.98]"
            >
              Iniciar corrida
            </button>
            <button
              onClick={finalizarCorrida}
              className="col-span-2 sm:col-span-1 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold py-2.5 rounded-xl transition active:scale-[0.98]"
            >
              Finalizar / cancelar
            </button>
          </div>
        </section>

        {/* Mapa ocupando bem a tela no mobile */}
        <section className="bg-slate-800/90 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">
              Mapa em tempo real
            </h3>
            <span className="text-[11px] text-slate-400">
              Atualiza automaticamente
            </span>
          </div>
          <div className="h-[55vh] sm:h-[60vh]">
            <MapaMotorista />
          </div>
        </section>
      </div>
    </div>
  )
}
