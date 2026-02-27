'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Badge, PBadge } from '@/components/badges'
import { SearchInput } from '@/components/search-input'
import { EditTitleModal } from '@/components/edit-title-modal'

type TitleType = 'MOVIE' | 'TV'
type InternalStatusType = 'AGUARDANDO_DOWNLOAD' | 'DISPONIVEL' | 'INDISPONIVEL'
type TvStatusType = 'EM_ANDAMENTO' | 'FINALIZADA'

interface Title {
  id: string
  title: string
  type: TitleType
  releaseYear: number | null
  posterUrl: string | null
  hasP1: boolean
  hasP2: boolean
  audioType: string | null
  internalStatus: InternalStatusType
  tvStatus: TvStatusType | null
  overview: string | null
  tmdbId: number
  tvSeasons: number | null
  tvEpisodes: number | null
  genres: string[]
  createdBy: { name: string }
}

export default function TitlesPage() {
  const { data: session } = useSession()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')

  const [titles, setTitles] = useState<Title[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterP1, setFilterP1] = useState('')
  const [filterP2, setFilterP2] = useState('')
  const [filterAudio, setFilterAudio] = useState("")
  const [filterStatus, setFilterStatus] = useState('')

  const [editTitle, setEditTitle] = useState<Title | null>(null)

  const fetchTitles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(search && { search }),
      ...(filterType && { type: filterType }),
      ...(filterP1 && { p1: filterP1 }),
      ...(filterP2 && { p2: filterP2 }),
      ...(filterAudio && { audioType: filterAudio }),
      ...(filterStatus && { internalStatus: filterStatus }),
    })
    const res = await fetch(`/api/titles?${params}`)
    const data = await res.json()
    setTitles(data.titles || [])
    setTotal(data.total || 0)
    setPages(data.pages || 1)
    setLoading(false)
  }, [page, search, filterType, filterP1, filterP2, filterAudio, filterStatus])

  useEffect(() => {
    const t = setTimeout(fetchTitles, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchTitles])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este título?')) return
    const res = await fetch(`/api/titles/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Título excluído')
      fetchTitles()
    } else {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Biblioteca</h1>
        <p className="text-muted-foreground mt-1">{total} títulos encontrados</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Buscar títulos..."
          className="w-full sm:w-64"
        />

        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos os tipos</option>
          <option value="MOVIE">Filmes</option>
          <option value="TV">Séries</option>
        </select>

        <button onClick={() => { setFilterP1(filterP1 === "true" ? "" : "true"); setPage(1); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition border " + (filterP1 === "true" ? "bg-orange-600 border-orange-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
          Serv B2P
        </button>
        <button onClick={() => { setFilterP2(filterP2 === "true" ? "" : "true"); setPage(1); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition border " + (filterP2 === "true" ? "bg-blue-600 border-blue-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
          Serv P2B
        </button>
        <button onClick={() => { setFilterAudio(filterAudio === "DUBLADO" ? "" : "DUBLADO"); setPage(1); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition border " + (filterAudio === "DUBLADO" ? "bg-purple-600 border-purple-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
          Dublado
        </button>
        <button onClick={() => { setFilterAudio(filterAudio === "LEGENDADO" ? "" : "LEGENDADO"); setPage(1); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition border " + (filterAudio === "LEGENDADO" ? "bg-purple-600 border-purple-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
          Legendado
        </button>
        <button onClick={() => { setFilterAudio(filterAudio === "DUBLADO_LEGENDADO" ? "" : "DUBLADO_LEGENDADO"); setPage(1); }} className={"px-4 py-2 rounded-lg text-sm font-medium transition border " + (filterAudio === "DUBLADO_LEGENDADO" ? "bg-purple-600 border-purple-600 text-white" : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500")}>
          Dub/Leg
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Poster</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">TMDB ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Ano</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Áudio</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">B2P</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">P2B</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                {isAdmin && <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : titles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Nenhum título encontrado</p>
                    <p className="text-sm mt-1">Tente ajustar os filtros</p>
                  </td>
                </tr>
              ) : (
                titles.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-4">
                      {t.posterUrl ? (
                        <div className="w-9 h-14 rounded overflow-hidden bg-muted shrink-0">
                          <img src={t.posterUrl} alt={t.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-14 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">?</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500 font-mono hidden sm:table-cell">{t.tmdbId}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm line-clamp-2 leading-tight">{t.title}</p>
                      {t.type === 'TV' && t.tvStatus && (
                        <div className="mt-1"><Badge status={t.tvStatus} /></div>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell"><Badge status={t.type} /></td>
                    <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">{t.releaseYear || '—'}</td>
                    <td className="py-3 px-4 hidden md:table-cell"><span className="text-xs text-zinc-400">{t.audioType === "DUBLADO_LEGENDADO" ? "Dub/Leg" : t.audioType === "LEGENDADO" ? "Leg" : t.audioType === "DUBLADO" ? "Dub" : "—"}</span></td>
                    <td className="py-3 px-4"><PBadge type="P1" active={t.hasP1} /></td>
                    <td className="py-3 px-4"><PBadge type="P2" active={t.hasP2} /></td>
                    <td className="py-3 px-4"><Badge status={t.internalStatus} /></td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTitle(t)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Página {page} de {pages} — {total} títulos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editTitle && (
        <EditTitleModal
          title={editTitle}
          onClose={() => setEditTitle(null)}
          onSaved={() => { setEditTitle(null); fetchTitles() }}
        />
      )}
    </div>
  )
}
