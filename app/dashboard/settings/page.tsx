'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => setAvatarUrl(d.image ? d.image + "?t=" + Date.now() : null))
      .catch(() => {})
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem muito grande (máx 2MB)'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const { url } = await res.json()
      setAvatarUrl(url + "?t=" + Date.now())
      window.dispatchEvent(new Event("avatar-updated"))
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
      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Avatar</h2>
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold border-2 border-border">
                {session?.user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <label htmlFor="avatar-input" className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition cursor-pointer">
              {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
            </label>
            <input id="avatar-input" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
          </div>
          <div>
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{session?.user?.role}</p>
            <label htmlFor="avatar-input" className="mt-2 text-xs text-primary hover:underline cursor-pointer block">
              {uploading ? 'Enviando...' : 'Trocar avatar'}
            </label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">PNG, JPG ou WebP. Máximo 2MB.</p>
      </div>
      <div className="mt-6 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">🎬</div>
          <div>
            <h2 className="font-semibold">Nars VHD</h2>
            <p className="text-xs text-muted-foreground">Seu acervo digital, organizado.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Plataforma pessoal para catalogar e gerenciar filmes e séries armazenados nos servidores P1 e P2. Tudo num só lugar — busca rápida, controle de disponibilidade e histórico de pedidos.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl mb-1">🎥</p>
            <p className="text-xs font-medium">Filmes & Séries</p>
            <p className="text-xs text-muted-foreground">+14.000 títulos</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl mb-1">🖥️</p>
            <p className="text-xs font-medium">Servidores</p>
            <p className="text-xs text-muted-foreground">P1 & P2</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl mb-1">📋</p>
            <p className="text-xs font-medium">Pedidos</p>
            <p className="text-xs text-muted-foreground">Controle total</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Desenvolvido por <span className="text-primary font-medium">DNars25</span></p>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">v1.0</span>
        </div>
      </div>
    </div>
  )
}
