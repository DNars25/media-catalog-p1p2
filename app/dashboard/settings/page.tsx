'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx 2MB)'); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Erro ao fazer upload')
      const { url } = await res.json()
      await update({ image: url })
      toast.success('Avatar atualizado!')
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Configurações</h1>
      <p className="text-muted-foreground">Personalize sua conta</p>

      {/* Avatar */}
      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold border-2 border-border">
                {session?.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
          <div>
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{session?.user?.role}</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 text-xs text-primary hover:underline"
            >
              {uploading ? 'Enviando...' : 'Trocar avatar'}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} />
        <p className="text-xs text-muted-foreground mt-4">PNG, JPG ou WebP. Máximo 2MB.</p>
      </div>

      {/* Sobre */}
      <div className="mt-6 bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-2">Sobre o sistema</h2>
        <p className="text-sm text-muted-foreground">Media Catalog P1P2 — sistema para catalogar filmes e séries com controle de disponibilidade em servidores P1 e P2.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">Stack</p>
            <p className="font-medium">Next.js 14 + Prisma + PostgreSQL</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-1">UI</p>
            <p className="font-medium">Tailwind CSS + shadcn/ui</p>
          </div>
        </div>
      </div>
    </div>
  )
}
