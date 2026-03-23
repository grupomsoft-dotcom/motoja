import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
    } catch (error) {
      alert('Erro: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🚀 MOTOJÁ</h1>
          <p className="text-white/90">Conectando você à moto mais próxima</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-white/30 rounded-2xl text-white placeholder-white/70 border border-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required 
            />
          </div>
          
          <div>
            <input 
              type="password" 
              placeholder="Senha" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-white/30 rounded-2xl text-white placeholder-white/70 border border-white/30 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-white text-blue-600 font-bold py-4 px-6 rounded-2xl text-lg hover:bg-blue-50 transition-all shadow-xl"
          >
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-white/80">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-white hover:text-blue-200"
          >
            {isLogin ? 'Cadastre-se' : 'Entre'}
          </button>
        </p>
      </div>
    </div>
  )
}
