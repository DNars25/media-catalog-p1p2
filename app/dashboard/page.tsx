import { prisma } from '@/lib/db'
import { Film, Download, ClipboardList, Server } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
    <Link href={href} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:scale-[1.03] transition-all group">
      <div className="relative" style={{ aspectRatio: '2/3' }}>
        {r.posterUrl ? (
          <img src={r.posterUrl} alt={r.requestedTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center p-2">
            <Film className="w-8 h-8 text-muted-foreground/20 mb-1" />
            <p className="text-xs text-center text-muted-foreground/50 line-clamp-3">{r.requestedTitle}</p>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5">
          <span className="text-xs bg-red-500/80 text-white px-1.5 py-0.5 rounded-full font-medium">Aberto</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
          <p className="text-xs font-medium text-white line-clamp-2 leading-tight">{r.requestedTitle}</p>
          <p className="text-xs text-white/50 mt-0.5">{r.createdBy.name}</p>
        </div>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const stats = await getStats()
  const open = await getOpenRequests()

  const cards = [
    { label: 'Total de Títulos', value: stats.totalTitles, icon: Film, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', href: '/dashboard/titles' },
    { label: 'Aguardando Download', value: stats.pendingTitles, icon: Download, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', href: '/dashboard/titles?internalStatus=AGUARDANDO_DOWNLOAD' },
    { label: 'Pedidos Abertos', value: stats.openRequests, icon: ClipboardList, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', href: '/dashboard/requests?status=ABERTO' },
    { label: 'Disponível em P1', value: stats.p1Count, icon: Server, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', href: '/dashboard/titles?p1=true' },
    { label: 'Disponível em P2', value: stats.p2Count, icon: Server, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', href: '/dashboard/titles?p2=true' },
    { label: 'Filmes', value: stats.movies, icon: Film, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', href: '/dashboard/titles?type=MOVIE' },
  ]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral do catálogo</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className={"bg-card border rounded-xl p-4 " + card.bg + " hover:scale-[1.02] transition-all cursor-pointer group"}>
            <div className={"p-1.5 rounded-lg bg-card border inline-flex mb-2 " + card.bg}>
              <card.icon className={"w-4 h-4 " + card.color} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              🎬 Pedidos Abertos — Filmes
              {open.movies.length > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{open.movies.length}</span>}
            </h2>
            <Link href="/dashboard/requests?type=MOVIE&status=ABERTO" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          {open.movies.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Nenhum pedido de filme em aberto</div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {open.movies.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=MOVIE&status=ABERTO" />)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              📺 Pedidos Abertos — Séries
              {open.series.length > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{open.series.length}</span>}
            </h2>
            <Link href="/dashboard/requests?type=TV&status=ABERTO" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          {open.series.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Nenhum pedido de série em aberto</div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {open.series.map((r) => <RequestCard key={r.id} r={r} href="/dashboard/requests?type=TV&status=ABERTO" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
