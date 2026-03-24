import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Rocket, Mail, Lock, User, Bike, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [role, setRole] = useState('passageiro') // 'passageiro' | 'motorista'
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        // No cadastro, passamos o metadado do tipo de usuário
        await signUp(email, password, { role })
      }
    } catch (error) {
      alert('Erro: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 overflow-hidden relative">
      {/* Efeito de luz de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>

      <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border border-white/10 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-indigo-500 rounded-2xl mb-4 shadow-lg shadow-indigo-500/50">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">MOTOJÁ</h1>
          <p className="text-slate-400 text-sm mt-2">Sua corrida rápida em duas rodas</p>
        </div>

        {/* Seletor de Perfil (Apenas no Cadastro) */}
        {!isLogin && (
          <div className="flex gap-3 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setRole('passageiro')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                role === 'passageiro' ? 'bg-white text-[#0f172a]' : 'text-slate-400'
              }`}
            >
              <User className="w-4 h-4" /> Passageiro
            </button>
            <button
              onClick={() => setRole('motorista')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                role === 'motorista' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400'
              }`}
            >
              <Bike className="w-4 h-4" /> Motorista
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="email" 
              placeholder="Seu melhor e-mail" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-2xl text-white placeholder-slate-500 border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              required 
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="password" 
              placeholder="Sua senha secreta" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 rounded-2xl text-white placeholder-slate-500 border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl text-lg hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              isLogin ? 'Acessar Conta' : 'Criar minha Conta'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-center text-slate-400 text-sm">
            {isLogin ? 'Novo por aqui?' : 'Já possui conta?'}{' '}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors underline decoration-indigo-500/30 underline-offset-4"
            >
              {isLogin ? 'Cadastre-se agora' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}