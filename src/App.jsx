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
  const [view, setView] = useState('passageiro') // ou 'historico_passageiro', 'motorista', 'historico_motorista'
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

      // define visão padrão baseado na role
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
        <div className="text-white text-2xl animate-pulse">🚀 Carregando MOTOJÁ...</div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  const isMotorista = perfil?.role === 'motorista'
  const isPassageiro = !isMotorista

  return (
    <>
      {/* Barra superior */}
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">🚀 MOTOJÁ</h1>
              <span className="bg-white/20 px-4 py-2 rounded-full text-white text-xs md:text-sm font-bold">
                {perfil?.nome || session.user.email} ({perfil?.role || 'sem perfil'})
              </span>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="self-start md:self-auto bg-white/20 hover:bg-white/30 px-5 py-2 rounded-2xl text-white text-sm font-bold transition-all shadow-lg"
            >
              Sair
            </button>
          </header>

          {/* Menus separados por tipo de usuário */}
          <div className="flex flex-wrap gap-3">
            {isPassageiro && (
              <>
                <button
                  onClick={() => setView('passageiro')}
                  className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold ${
                    view === 'passageiro'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Passageiro
                </button>

                <button
                  onClick={() => setView('historico_passageiro')}
                  className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold ${
                    view === 'historico_passageiro'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
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
                  className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold ${
                    view === 'motorista'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Motorista
                </button>

                <button
                  onClick={() => setView('historico_motorista')}
                  className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold ${
                    view === 'historico_motorista'
                      ? 'bg-slate-700 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Histórico de atendimentos
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      {isPassageiro && view === 'passageiro' && <PassageiroDashboard />}
      {isPassageiro && view === 'historico_passageiro' && <HistoricoPassageiro />}

      {isMotorista && view === 'motorista' && <MotoristaDashboard />}
      {isMotorista && view === 'historico_motorista' && <HistoricoMotorista />}
    </>
  )
}

export default App
