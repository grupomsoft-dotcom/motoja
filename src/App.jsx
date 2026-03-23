import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import PassageiroDashboard from './pages/PassageiroDashboard'
import HistoricoPassageiro from './pages/HistoricoPassageiro'
import MotoristaDashboard from './pages/MotoristaDashboard'
import HistoricoMotorista from './pages/HistoricoMotorista'

function App() {
  const { session, loading } = useAuth()
  const [view, setView] = useState('passageiro')
  const [perfil, setPerfil] = useState(null)
  const [perfilLoading, setPerfilLoading] = useState(true)

  useEffect(() => {
    const carregarPerfil = async () => {
      if (!session) {
        setPerfil(null)
        setPerfilLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, nome, telefone')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
      }

      setPerfil(data)
      setPerfilLoading(false)

      if (data?.role === 'motorista') {
        setView('motorista')
      } else {
        setView('passageiro')
      }
    }

    carregarPerfil()
  }, [session])

  if (loading || perfilLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-xl animate-pulse px-4 text-center">
          🚀 Carregando MOTOJÁ...
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const isMotorista = perfil?.role === 'motorista'
  const isPassageiro = !isMotorista

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Barra superior */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 px-4 py-3 sm:px-6 sm:py-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
                🚀 MOTOJÁ
              </h1>
              <span className="hidden sm:inline-flex bg-white/20 px-3 py-1 rounded-full text-white text-xs font-semibold truncate">
                {perfil?.nome || session.user.email}
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="shrink-0 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl text-white text-xs sm:text-sm font-semibold transition"
            >
              Sair
            </button>
          </header>

          {/* Badge pequena com função/role no mobile */}
          <div className="mt-2 flex items-center justify-between">
            <span className="inline-flex sm:hidden bg-white/15 px-2.5 py-1 rounded-full text-[11px] text-white font-medium">
              {perfil?.nome || session.user.email}
            </span>
            <span className="ml-auto bg-black/20 px-2.5 py-0.5 rounded-full text-[11px] text-white/90 uppercase tracking-wide">
              {perfil?.role || 'sem perfil'}
            </span>
          </div>

          {/* Menus separados */}
          <div className="mt-3 flex flex-wrap gap-2">
            {isPassageiro && (
              <>
                <button
                  onClick={() => setView('passageiro')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    view === 'passageiro'
                      ? 'bg-emerald-400 text-slate-900'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  Passageiro
                </button>

                <button
                  onClick={() => setView('historico_passageiro')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    view === 'historico_passageiro'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  Histórico de corridas
                </button>
              </>
            )}

            {isMotorista && (
              <>
                <button
                  onClick={() => setView('motorista')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    view === 'motorista'
                      ? 'bg-orange-400 text-slate-900'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  Motorista
                </button>

                <button
                  onClick={() => setView('historico_motorista')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    view === 'historico_motorista'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  Histórico de atendimentos
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal ocupa o resto da tela */}
      <div className="flex-1">
        {isPassageiro && view === 'passageiro' && <PassageiroDashboard />}
        {isPassageiro && view === 'historico_passageiro' && <HistoricoPassageiro />}

        {isMotorista && view === 'motorista' && <MotoristaDashboard />}
        {isMotorista && view === 'historico_motorista' && <HistoricoMotorista />}
      </div>
    </div>
  )
}

export default App
