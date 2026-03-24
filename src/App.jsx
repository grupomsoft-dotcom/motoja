export default function App() {
  return (
    <AuthProvider> {/* O Provedor fica NO TOPO de tudo */}
      <Router>
        <Suspense fallback={<TelaCarregando />}>
          <Routes>
             {/* ... suas rotas */}
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}