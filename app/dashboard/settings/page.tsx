'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Camera, Loader2, DatabaseZap } from 'lucide-react'

interface BackfillResult {
  summary: { processed: number; skipped: number; errors: number; totalEpisodes: number; totalTitles: number }
  details: { title: string; episodes: number; status: 'ok' | 'skip' | 'error'; reason?: string }[]
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null)
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'

  async function handleBackfill() {
    setBackfilling(true)
    setBackfillResult(null)
    try {
      const res = await fetch('/api/admin/backfill-episodes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao executar')
      setBackfillResult(data)
      if (data.summary.processed > 0) {
        toast.success(`${data.summary.processed} séries atualizadas — ${data.summary.totalEpisodes} episódios criados`)
      } else {
        toast.info('Nenhuma série nova para sincronizar')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro inesperado')
    } finally {
      setBackfilling(false)
    }
  }

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
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Configurações</h1>
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
            <h2 className="font-semibold">Encoding Solutions</h2>
            <p className="text-xs text-muted-foreground">Seu acervo digital, organizado.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">Plataforma pessoal para catalogar e gerenciar filmes e séries armazenados nos servidores B2P e P2B. Tudo num só lugar — busca rápida, controle de disponibilidade e histórico de pedidos.</p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl mb-1">🎥</p>
            <p className="text-xs font-medium">Filmes & Séries</p>
            <p className="text-xs text-muted-foreground">+14.000 títulos</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl mb-1">🖥️</p>
            <p className="text-xs font-medium">Servidores</p>
            <p className="text-xs text-muted-foreground">B2P & P2B</p>
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

      {isSuperAdmin && (
        <div className="mt-6 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <DatabaseZap className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Sincronizar Episódios</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Popula automaticamente os episódios de todas as séries que ainda não têm essa informação registrada,
            consultando os dados do TMDB. Cada série recebe todos os episódios de todas as temporadas disponíveis.
          </p>

          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
            {backfilling ? 'Sincronizando... (pode demorar)' : 'Sincronizar agora'}
          </button>

          {backfillResult && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Séries', value: backfillResult.summary.totalTitles, color: 'text-foreground' },
                  { label: 'Atualizadas', value: backfillResult.summary.processed, color: 'text-green-500' },
                  { label: 'Ignoradas', value: backfillResult.summary.skipped, color: 'text-muted-foreground' },
                  { label: 'Erros', value: backfillResult.summary.errors, color: 'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de episódios criados: <span className="font-bold text-foreground">{backfillResult.summary.totalEpisodes.toLocaleString('pt-BR')}</span>
              </p>

              {backfillResult.details.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-primary cursor-pointer hover:underline">Ver detalhes por série</summary>
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {backfillResult.details.map((d, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-foreground truncate flex-1 mr-2">{d.title}</span>
                        {d.status === 'ok' && <span className="text-green-500 shrink-0">+{d.episodes} eps</span>}
                        {d.status === 'skip' && <span className="text-muted-foreground shrink-0">ignorado</span>}
                        {d.status === 'error' && <span className="text-red-500 shrink-0" title={d.reason}>erro</span>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
