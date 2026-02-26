'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
const schema = z.object({
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatoria'),
})
type FormData = z.infer<typeof schema>
export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await signIn('credentials', { username: data.username, password: data.password, redirect: false })
    setLoading(false)
    if (res?.error) { toast.error('Credenciais invalidas') } else { router.push('/dashboard') }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#080808' }}>
      <div className="w-full" style={{ maxWidth: '480px' }}>
        <div className="flex justify-center mb-2">
          <img src="/Logo-transparente.png" alt="Encoding Solutions" style={{ width: '480px', maxWidth: '90vw' }} />
        </div>
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#151515' }}>
          <h2 className="text-xl font-bold mb-6">Entrar</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Usuário</label>
              <input {...register('username')} type="text" placeholder="seu usuário ou email" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }} />
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Senha</label>
              <input {...register('password')} type="password" placeholder="........" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }} />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 text-white" style={{ backgroundColor: '#f97316' }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
        <div className="mt-4 text-center">
          <a href="/vitrine" className="w-full block font-medium py-3 rounded-lg text-white text-center transition-all" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>Vitrine — Consultar Catálogo</a>
        </div>
      </div>
    </div>
  )
}
