import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth' 
import { Loader2, Bike } from 'lucide-react'

// 1. Carregamento Preguiçoso (Lazy Loading)
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

// 3. Componente de Guarda de Rota
const RotaPrivada = ({ children, tipoRequerido }) => {
  const { session, loading } = useAuth()
  
  if (loading) return <TelaCarregando />
  if (!session) return <Navigate to="/" />

  const userRole = session.user.user_metadata?.role

  if (tipoRequerido && userRole !== tipoRequerido) {
    return <Navigate to={userRole === 'motorista' ? '/motorista' : '/passageiro'} />
  }
  
  return children
}

// 4. Lógica de Redirecionamento da Home
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
    <AuthProvider> 
      <Router>
        <Suspense fallback={<TelaCarregando />}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />

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

            <Route 
              path="/passageiro" 
              element={
                <RotaPrivada tipoRequerido="passageiro">
                  <PassageiroDashboard />
                </RotaPrivada>
              } 
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}