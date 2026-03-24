import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Loader2, Bike } from 'lucide-react'

// 1. Carregamento Preguiçoso (Lazy Loading)
// O código dos mapas e dashboards só é baixado quando necessário
const Login = lazy(() => import('./pages/Login'))
const MotoristaDashboard = lazy(() => import('./pages/MotoristaDashboard'))
const PassageiroDashboard = lazy(() => import('./pages/PassageiroDashboard'))
const HistoricoMotorista = lazy(() => import('./pages/HistoricoMotorista'))

// 2. Componente de Carregamento (Feedback Visual)
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

// 3. Proteção de Rotas (Privadas)
const RotaPrivada = ({ children }) => {
  const { session, loading } = useAuth()
  
  if (loading) return <TelaCarregando />
  if (!session) return <Navigate to="/" />
  
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Suspense envolve todas as rotas para gerenciar o carregamento dos arquivos Lazy */}
        <Suspense fallback={<TelaCarregando />}>
          <Routes>
            {/* Rota Pública */}
            <Route path="/" element={<Login />} />

            {/* Rotas do Motorista */}
            <Route 
              path="/motorista" 
              element={
                <RotaPrivada>
                  <MotoristaDashboard />
                </RotaPrivada>
              } 
            />
            
            <Route 
              path="/motorista/historico" 
              element={
                <RotaPrivada>
                  <HistoricoMotorista />
                </RotaPrivada>
              } 
            />

            {/* Rotas do Passageiro */}
            <Route 
              path="/passageiro" 
              element={
                <RotaPrivada>
                  <PassageiroDashboard />
                </RotaPrivada>
              } 
            />

            {/* Fallback para rotas inexistentes */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}