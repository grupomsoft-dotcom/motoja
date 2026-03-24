import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth' // Importação nomeada correta
import { Loader2, Bike } from 'lucide-react'

// 1. Carregamento Preguiçoso (Lazy Loading) para Performance
const Login = lazy(() => import('./pages/Login'))
const MotoristaDashboard = lazy(() => import('./pages/MotoristaDashboard'))
const PassageiroDashboard = lazy(() => import('./pages/PassageiroDashboard'))
const HistoricoMotorista = lazy(() => import('./pages/HistoricoMotorista'))

// 2. Componente de Feedback de Carregamento
const TelaCarregando = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-4">
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
      <Loader2 className="animate-spin text-indigo-500 relative" size={48} />
      <Bike className="absolute text-white w-4 h-4" />
    </div>
    <div className="text-center">
      <h2 className="text-white font-black text-sm uppercase tracking-[0.3em]">MotoJá</h2>
      <p className="text-slate-500 text-[10px] mt-1 font-medium animate-pulse">Sincronizando Módulos...</p>
    </div>
  </div>
)

// 3. Componente de Guarda de Rota com Redirecionamento Inteligente
const RotaPrivada = ({ children, tipoRequerido }) => {
  const { session, loading } = useAuth()
  
  if (loading) return <TelaCarregando />
  if (!session) return <Navigate to="/" />

  // Pega o cargo (role) do usuário nos metadados do Supabase
  const userRole = session.user.user_metadata?.role

  // Se o usuário tentar acessar a rota errada para o perfil dele
  if (tipoRequerido && userRole !== tipoRequerido) {
    return <Navigate to={userRole === 'motorista' ? '/motorista' : '/passageiro'} />
  }
  
  return children
}

// 4. Lógica de Redirecionamento da Home (Se já estiver logado)
const HomeRedirect = () => {
  const { session, loading } = useAuth()
  
  if (loading) return <TelaCarregando />
  if (session) {
    const role = session.user.user_metadata?.role
    return <Navigate to={role === 'motorista' ? '/motorista' : '/passageiro'} />
  }
  
  return <Login />
}

export default function App() {
  return (
    <AuthProvider> {/* Certifique-se que o useAuth.jsx exporta EXATAMENTE este nome */}
      <Router>
        <Suspense fallback={<TelaCarregando />}>
          <Routes>
            {/* Rota Inicial com verificação de Login */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Rotas Privadas do Motorista */}
            <Route 
              path="/motorista" 
              element={
                <RotaPrivada tipoRequerido="motorista">
                  <MotoristaDashboard />
                </RotaPrivada>
              } 
            />
            
            <Route 
              path="/motorista/historico" 
              element={
                <RotaPrivada tipoRequerido="motorista">
                  <HistoricoMotorista />
                </RotaPrivada>
              } 
            />

            {/* Rotas Privadas do Passageiro */}
            <Route 
              path="/passageiro" 
              element={
                <RotaPrivada tipoRequerido="passageiro">
                  <PassageiroDashboard />
                </RotaPrivada>
              } 
            />

            {/* Redirecionar qualquer rota inválida para a Home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}