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
  email: z.string().email('Email invalido'),
  password: z.string().min(1, 'Senha obrigatoria'),
})
type FormData = z.infer<typeof schema>
export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
    setLoading(false)
    if (res?.error) { toast.error('Credenciais invalidas') } else { router.push('/dashboard') }
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#050d18' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/nars-logo.png" alt="Encoding Solutions" className="h-28 w-auto object-contain" />
        </div>
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#0f1923' }}>
          <h2 className="text-xl font-bold mb-6">Entrar</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Email</label>
              <input {...register('email')} type="email" placeholder="seu@email.com" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3545' }} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">Senha</label>
              <input {...register('password')} type="password" placeholder="........" className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-white" style={{ backgroundColor: '#1a2535', border: '1px solid #2a3545' }} />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 text-white" style={{ backgroundColor: '#f97316' }}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
