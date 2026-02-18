import { prisma } from '@/lib/db'
import { Film, Download, ClipboardList, Server } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const [totalTitles, pendingTitles, openRequests, p1Count, p2Count, movies] = await Promise.all([
    prisma.title.count(),
    prisma.title.count({ where: { internalStatus: 'AGUARDANDO_DOWNLOAD' } }),
    prisma.request.count({ where: { status: 'ABERTO' } }),
    prisma.title.count({ where: { hasP1: true } }),
    prisma.title.count({ where: { hasP2: true } }),
    prisma.title.count({ where: { type: 'MOVIE' } }),
  ])
  return { totalTitles, pendingTitles, openRequests, p1Count, p2Count, movies }
}

async function getOpenRequests() {
  const [movies, series] = await Promise.all([
    prisma.request.findMany({
      where: { type: 'MOVIE', status: 'ABERTO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, posterUrl: true, createdAt: true },
    }),
    prisma.request.findMany({
      where: { type: 'TV', status: 'ABERTO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, posterUrl: true, createdAt: true },
    }),
  ])
  return { movies, series }
}

function RequestCard({ r, href, color }: { r: any; href: string; color: string }) {
  const date = new Date(r.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return (
    <Link href={href} className="group block">
      <div className="relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.03]" style={{ aspectRatio: '2/3' }}>
        {r.posterUrl ? (
          <img src={r.posterUrl} alt={r.requestedTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col items-center justify-center p-2">
            <Film className="w-6 h-6 text-zinc-600 mb-1" />
            <p className="text-[10px] text-center text-zinc-500 line-clamp-3 leading-tight">{r.requestedTitle}</p>
          </div>
        )}
        {/* colored bar at bottom like TMDB */}
        <div className={"absolute bottom-0 left-0 right-0 h-1 " + color} />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{r.requestedTitle}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const stats = await getStats()
  const open = await getOpenRequests()

  const cards = [
    { label: 'Total', value: stats.totalTitles, icon: Film, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', href: '/dashboard/titles' },
    { label: 'Aguardando', value: stats.pendingTitles, icon: Download, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', href: '/dashboard/titles?internalStatus=AGUARDANDO_DOWNLOAD' },
    { label: 'Pedidos', value: stats.openRequests, icon: ClipboardList, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', href: '/dashboard/requests?status=ABERTO' },
    { label: 'P1', value: stats.p1Count, icon: Server, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', href: '/dashboard/titles?p1=true' },
    { label: 'P2', value: stats.p2Count, icon: Server, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', href: '/dashboard/titles?p2=true' },
    { label: 'Filmes', value: stats.movies, icon: Film, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', href: '/dashboard/titles?type=MOVIE' },
  ]

  return (
    <div className="p-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Visão geral do catálogo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-2 mb-7">
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
          <div className="grid grid-cols-5 gap-4">
            {open.movies.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=MOVIE&status=ABERTO" color="bg-orange-500" />)}
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
          <div className="grid grid-cols-5 gap-4">
            {open.series.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=TV&status=ABERTO" color="bg-green-500" />)}
          </div>
        )}
      </div>
    </div>
  )
}
