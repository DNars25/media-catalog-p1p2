import { prisma } from '@/lib/db'
import { Film, ClipboardList, Tv, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [totalTitles, openRequests, awaitingUpdate, movies, tvShows] = await Promise.all([
    prisma.title.count(),
    prisma.request.count({ where: { status: 'ABERTO', isUpdate: false, isCorrection: false } }),
    prisma.title.count({ where: { type: 'TV', tvStatus: 'EM_ANDAMENTO' } }),
    prisma.title.count({ where: { type: 'MOVIE' } }),
    prisma.title.count({ where: { type: 'TV' } }),
  ])
  return { totalTitles, openRequests, awaitingUpdate, movies, tvShows }
}

async function getOpenRequests() {
  const [movies, series] = await Promise.all([
    prisma.request.findMany({
      where: { type: 'MOVIE', status: 'ABERTO', isUpdate: false, isCorrection: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, posterUrl: true, createdAt: true },
    }),
    prisma.request.findMany({
      where: { type: 'TV', status: 'ABERTO', isUpdate: false, isCorrection: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, posterUrl: true, createdAt: true },
    }),
  ])
  return { movies, series }
}

interface DashboardRequest {
  id: string
  requestedTitle: string
  posterUrl: string | null
  createdAt: Date
}

function RequestCard({ r, href, barColor }: { r: DashboardRequest; href: string; barColor: string }) {
  const date = new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return (
    <Link href={href} className="group block w-[150px] flex-shrink-0">
      <div className="relative rounded-lg overflow-hidden border border-border/40 hover:border-primary/60 transition-all hover:scale-[1.03] bg-card" style={{ width: '150px', height: '225px' }}>
        {r.posterUrl ? (
          <img src={r.posterUrl} alt={r.requestedTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center p-2">
            <Film className="w-6 h-6 text-zinc-600 mb-1" />
            <p className="text-[10px] text-center text-zinc-500 line-clamp-3 leading-tight">{r.requestedTitle}</p>
          </div>
        )}
        <div className={"absolute bottom-0 left-0 right-0 h-1 " + barColor} />
      </div>
      <div className="mt-2 w-[150px]">
        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{r.requestedTitle}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const stats = await getStats()
  const open = await getOpenRequests()

  const cards = [
    { label: 'Total no Sistema', value: stats.totalTitles, icon: Film, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', href: '/dashboard/titles' },
    { label: 'Pedidos', value: stats.openRequests, icon: ClipboardList, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', href: '/dashboard/requests?status=ABERTO' },
    { label: 'Aguardando Atualização', value: stats.awaitingUpdate, icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', href: '/dashboard/atualizacoes' },
    { label: 'Filmes', value: stats.movies, icon: Film, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', href: '/dashboard/titles?type=MOVIE' },
    { label: 'Séries', value: stats.tvShows, icon: Tv, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', href: '/dashboard/titles?type=TV' },
  ]

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-7">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className={"bg-card border rounded-xl p-3 " + card.bg + " hover:scale-[1.02] transition-all"}>
            <div className={"p-1.5 rounded-lg bg-card border inline-flex mb-2 " + card.bg}>
              <card.icon className={"w-3.5 h-3.5 " + card.color} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Filmes */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            🎬 Filmes — Pedidos Abertos
            {open.movies.length > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{open.movies.length}</span>}
          </h2>
          <Link href="/dashboard/requests?type=MOVIE&status=ABERTO" className="text-xs text-primary hover:underline">Ver todos →</Link>
        </div>
        {open.movies.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Nenhum pedido de filme em aberto</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
            {open.movies.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=MOVIE&status=ABERTO" barColor="bg-orange-500" />)}
          </div>
        )}
      </div>

      {/* Séries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            📺 Séries — Pedidos Abertos
            {open.series.length > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{open.series.length}</span>}
          </h2>
          <Link href="/dashboard/requests?type=TV&status=ABERTO" className="text-xs text-primary hover:underline">Ver todos →</Link>
        </div>
        {open.series.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Nenhum pedido de série em aberto</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
            {open.series.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=TV&status=ABERTO" barColor="bg-green-500" />)}
          </div>
        )}
      </div>
    </div>
  )
}
