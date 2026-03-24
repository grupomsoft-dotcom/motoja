import { useEffect, useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import PassageiroDashboard from './pages/PassageiroDashboard'
import HistoricoPassageiro from './pages/HistoricoPassageiro'
import MotoristaDashboard from './pages/MotoristaDashboard'
import HistoricoMotorista from './pages/HistoricoMotorista'
import { LogOut, User, Bike, History, Rocket, Loader2 } from 'lucide-react'

function App() {
  const { session, loading: authLoading } = useAuth()
  const [view, setView] = useState(null) // Começa nulo para definir após o perfil
  const [perfil, setPerfil] = useState(null)
  const [perfilLoading, setPerfilLoading] = useState(true)

  useEffect(() => {
    async function carregarPerfil() {
      if (!session?.user?.id) {
        setPerfil(null)
        setPerfilLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, nome, telefone')
        .eq('id', session.user.id)
        .single()

      if (!error && data) {
        setPerfil(data)
        // Define a view inicial baseada no cargo
        setView(data.role === 'motorista' ? 'motorista' : 'passageiro')
      }
      setPerfilLoading(false)
    }

    carregarPerfil()
  }, [session])

  // Mapeamento de views para limpar o JSX
  const views = {
    passageiro: <PassageiroDashboard />,
    historico_passageiro: <HistoricoPassageiro />,
    motorista: <MotoristaDashboard />,
    historico_motorista: <HistoricoMotorista />,
  }

  const isMotorista = perfil?.role === 'motorista'

  if (authLoading || perfilLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a]">
        <div className="relative">
          <Rocket className="w-12 h-12 text-indigo-500 animate-bounce" />
          <Loader2 className="w-16 h-16 text-indigo-500/20 animate-spin absolute -top-2 -left-2" />
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Preparando sua rota...</p>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-100">
      {/* Navbar Moderna */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20">
                <Rocket size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-black tracking-tighter">MOTOJÁ</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-white">{perfil?.nome || 'Usuário'}</span>
                <span className="text-[10px] text-indigo-400 uppercase font-black">{perfil?.role}</span>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all border border-white/5"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Seletor de Abas (Tabs) */}
          <div className="flex gap-2 mt-5 p-1 bg-white/5 rounded-2xl w-fit">
            {isMotorista ? (
              <>
                <TabButton 
                  active={view === 'motorista'} 
                  onClick={() => setView('motorista')}
                  icon={<Bike size={14} />}
                  label="Painel"
                />
                <TabButton 
                  active={view === 'historico_motorista'} 
                  onClick={() => setView('historico_motorista')}
                  icon={<History size={14} />}
                  label="Histórico"
                />
              </>
            ) : (
              <>
                <TabButton 
                  active={view === 'passageiro'} 
                  onClick={() => setView('passageiro')}
                  icon={<User size={14} />}
                  label="Pedir Moto"
                />
                <TabButton 
                  active={view === 'historico_passageiro'} 
                  onClick={() => setView('historico_passageiro')}
                  icon={<History size={14} />}
                  label="Minhas Viagens"
                />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto h-full">
          {views[view]}
        </div>
      </main>
    </div>
  )
}

// Subcomponente de Botão para as abas
function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default App