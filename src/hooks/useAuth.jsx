import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 1. Criamos o contexto
const AuthContext = createContext({})

// 2. EXPORTAMOS o Provider (O erro está aqui se faltar o 'export')
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Ouve mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    if (error) throw error
    return data
  }

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// 3. EXPORTAMOS o Hook
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}