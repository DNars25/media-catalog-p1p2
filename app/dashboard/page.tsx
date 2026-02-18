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
      select: { id: true, requestedTitle: true, posterUrl: true, createdBy: { select: { name: true } } },
    }),
    prisma.request.findMany({
      where: { type: 'TV', status: 'ABERTO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, posterUrl: true, createdBy: { select: { name: true } } },
    }),
  ])
  return { movies, series }
}

function RequestCard({ r, href }: { r: any; href: string }) {
  return (
    <Link href={href} className="bg-card border border-border rounded-md overflow-hidden hover:border-primary/50 hover:scale-[1.03] transition-all group block">
      <div className="relative w-full" style={{ paddingBottom: '148%' }}>
        <div className="absolute inset-0">
          {r.posterUrl ? (
            <img src={r.posterUrl} alt={r.requestedTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/30 flex flex-col items-center justify-center p-1">
              <Film className="w-4 h-4 text-muted-foreground/20 mb-1" />
              <p className="text-[9px] text-center text-muted-foreground/40 line-clamp-3 leading-tight">{r.requestedTitle}</p>
            </div>
          )}
          <div className="absolute top-1 right-1">
            <span className="bg-red-500/80 text-white px-1 py-0.5 rounded-full font-medium text-[8px]">Aberto</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-1.5 pb-1.5 pt-4">
            <p className="text-[10px] font-medium text-white line-clamp-1 leading-tight">{r.requestedTitle}</p>
          </div>
        </div>
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
    <div className="p-4 h-screen flex flex-col overflow-hidden">
      <div className="mb-3">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-xs mt-0.5">Visão geral do catálogo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className={"bg-card border rounded-lg p-2.5 " + card.bg + " hover:scale-[1.02] transition-all cursor-pointer"}>
            <div className={"p-1 rounded-md bg-card border inline-flex mb-1 " + card.bg}>
              <card.icon className={"w-3 h-3 " + card.color} />
            </div>
            <p className="text-lg font-bold leading-none">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Requests grid - split 50/50 */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {[
          { label: '🎬 Filmes — Pedidos Abertos', items: open.movies, href: '/dashboard/requests?type=MOVIE&status=ABERTO', empty: 'Nenhum pedido de filme em aberto' },
          { label: '📺 Séries — Pedidos Abertos', items: open.series, href: '/dashboard/requests?type=TV&status=ABERTO', empty: 'Nenhum pedido de série em aberto' },
        ].map(({ label, items, href, empty }) => (
          <div key={label} className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h2 className="text-xs font-semibold flex items-center gap-1.5">
                {label}
                {items.length > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{items.length}</span>}
              </h2>
              <Link href={href} className="text-xs text-primary hover:underline">Ver todos →</Link>
            </div>
            {items.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-4 text-center text-muted-foreground text-xs flex-1 flex items-center justify-center">{empty}</div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {items.map((r) => <RequestCard key={r.id} r={r} href={href} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
