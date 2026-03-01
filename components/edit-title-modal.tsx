'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Loader2, Trash2, DatabaseZap } from 'lucide-react'

interface TitleForModal {
  id: string
  title: string
  type: 'MOVIE' | 'TV'
  hasP1: boolean
  hasP2: boolean
  internalStatus: string
  tvStatus: string | null
  tvSeasons: number | null
  tvEpisodes: number | null
}

interface TitleEpisode {
  season: number
  episode: number
}

interface EditTitleModalProps {
  title: TitleForModal
  onClose: () => void
  onSaved: () => void
}

function fmtRange(eps: number[]): string {
  const s = [...eps].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = s[0], end = s[0]
  for (let i = 1; i < s.length; i++) {
    if (s[i] === end + 1) {
      end = s[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`)
      start = end = s[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`)
  return ranges.join(', ')
}

export function EditTitleModal({ title, onClose, onSaved }: EditTitleModalProps) {
  const [form, setForm] = useState({
    hasP1: title.hasP1,
    hasP2: title.hasP2,
    internalStatus: title.internalStatus,
    tvStatus: title.tvStatus || '',
  })
  const [loading, setLoading] = useState(false)
  const [episodes, setEpisodes] = useState<TitleEpisode[]>([])
  const [loadingEps, setLoadingEps] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (title.type !== 'TV') return
    setLoadingEps(true)
    fetch(`/api/titles/${title.id}`)
      .then(r => r.json())
      .then(data => setEpisodes(data.episodes || []))
      .catch(() => {})
      .finally(() => setLoadingEps(false))
  }, [title.id, title.type])

  const episodesBySeason = episodes.reduce<Record<number, number[]>>((acc, ep) => {
    if (!acc[ep.season]) acc[ep.season] = []
    acc[ep.season].push(ep.episode)
    return acc
  }, {})

  const handleDeleteEpisode = async (season: number, episode: number) => {
    const key = `${season}-${episode}`
    setDeletingKey(key)
    try {
      const res = await fetch(`/api/titles/${title.id}/episodes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season, episode }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEpisodes(data.episodes || [])
      toast.success(`Ep. ${episode} da Temporada ${season} removido`)
    } catch {
      toast.error('Erro ao remover episódio')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleDeleteSeason = async (season: number) => {
    const key = `season-${season}`
    setDeletingKey(key)
    try {
      const res = await fetch(`/api/titles/${title.id}/episodes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEpisodes(data.episodes || [])
      toast.success(`Temporada ${season} removida`)
    } catch {
      toast.error('Erro ao remover temporada')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/titles/${title.id}/sync-episodes`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')
      setEpisodes(data.episodes || [])
      toast.success(`${data.totalCreated} episódios sincronizados via TMDB!`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    const res = await fetch(`/api/titles/${title.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        tvStatus: form.tvStatus || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Título atualizado!')
      onSaved()
    } else {
      toast.error('Erro ao salvar')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold truncate">{title.title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* P1/P2 toggles */}
          <div className="flex gap-4">
            {(['P1', 'P2'] as const).map((p) => {
              const key = p === 'P1' ? 'hasP1' : 'hasP2'
              const label = p === 'P1' ? 'B2P' : 'P2B'
              return (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${form[key] ? 'bg-primary' : 'bg-muted'}`}
                    onClick={() => setForm({ ...form, [key]: !form[key] })}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              )
            })}
          </div>

          {/* Status Interno */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status Interno</label>
            <select
              value={form.internalStatus}
              onChange={(e) => setForm({ ...form, internalStatus: e.target.value })}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="AGUARDANDO_DOWNLOAD">Aguardando Download</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="INDISPONIVEL">Indisponível</option>
            </select>
          </div>

          {title.type === 'TV' && (
            <>
              {/* Status da Série */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Status da Série</label>
                <select
                  value={form.tvStatus}
                  onChange={(e) => setForm({ ...form, tvStatus: e.target.value })}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Não definido</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
              </div>

              {/* Episódios na Biblioteca — por temporada */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Episódios na Biblioteca</span>
                  {(title.tvSeasons != null || title.tvEpisodes != null) && (
                    <span className="text-xs text-muted-foreground">
                      TMDB: {title.tvSeasons ?? '?'} temp · {title.tvEpisodes ?? '?'} eps
                    </span>
                  )}
                </div>

                {loadingEps ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">Carregando episódios...</span>
                  </div>
                ) : episodes.length === 0 ? (
                  <div className="flex flex-col gap-2 py-2">
                    <p className="text-xs text-muted-foreground italic">Nenhum episódio cadastrado na biblioteca.</p>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition disabled:opacity-50 self-start"
                    >
                      {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
                      {syncing ? 'Sincronizando...' : 'Sincronizar via TMDB'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(episodesBySeason)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([season, eps]) => {
                        const seasonNum = parseInt(season)
                        const seasonKey = `season-${seasonNum}`
                        const isDeletingSeason = deletingKey === seasonKey
                        return (
                          <div key={season} className="bg-muted rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold">Temporada {season}</span>
                              <button
                                onClick={() => handleDeleteSeason(seasonNum)}
                                disabled={deletingKey !== null}
                                className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 disabled:opacity-40 transition-opacity"
                                title="Apagar temporada inteira"
                              >
                                {isDeletingSeason
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Trash2 className="w-3 h-3" />
                                }
                                Apagar temporada
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[...eps].sort((a, b) => a - b).map(ep => {
                                const epKey = `${seasonNum}-${ep}`
                                const isDeletingEp = deletingKey === epKey
                                return (
                                  <button
                                    key={ep}
                                    onClick={() => handleDeleteEpisode(seasonNum, ep)}
                                    disabled={deletingKey !== null}
                                    className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1 text-xs font-medium hover:border-destructive hover:text-destructive disabled:opacity-40 transition-colors group"
                                    title={`Remover Ep. ${ep}`}
                                  >
                                    {isDeletingEp
                                      ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      : <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    }
                                    {ep}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    <p className="text-xs text-muted-foreground text-right">
                      {episodes.length} episódio{episodes.length !== 1 ? 's' : ''} no total
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
