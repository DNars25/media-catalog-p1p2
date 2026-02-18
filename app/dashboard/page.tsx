import { prisma } from '@/lib/db'
import { Film, Download, ClipboardList, Server } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const [totalTitles, pendingTitles, openRequests, p1Count, p2Count, movies, tvShows] = await Promise.all([
    prisma.title.count(),
    prisma.title.count({ where: { internalStatus: 'AGUARDANDO_DOWNLOAD' } }),
    prisma.request.count({ where: { status: 'ABERTO' } }),
    prisma.title.count({ where: { hasP1: true } }),
    prisma.title.count({ where: { hasP2: true } }),
    prisma.title.count({ where: { type: 'MOVIE' } }),
    prisma.title.count({ where: { type: 'TV' } }),
  ])
  return { totalTitles, pendingTitles, openRequests, p1Count, p2Count, movies, tvShows }
}

async function getOpenRequests() {
  const [movies, series] = await Promise.all([
    prisma.request.findMany({
      where: { type: 'MOVIE', status: 'ABERTO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, status: true, createdAt: true, createdBy: { select: { name: true } } },
    }),
    prisma.request.findMany({
      where: { type: 'TV', status: 'ABERTO' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, requestedTitle: true, status: true, createdAt: true, createdBy: { select: { name: true } } },
    }),
  ])
  return { movies, series }
}

export default async function DashboardPage() {
  const stats = await getStats()
  const open = await getOpenRequests()

  const cards = [
    { label: 'Total de Títulos', value: stats.totalTitles, icon: Film, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', href: '/dashboard/titles', description: 'Ver todos os títulos' },
    { label: 'Aguardando Download', value: stats.pendingTitles, icon: Download, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', href: '/dashboard/titles?internalStatus=AGUARDANDO_DOWNLOAD', description: 'Ver títulos pendentes' },
    { label: 'Pedidos Abertos', value: stats.openRequests, icon: ClipboardList, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', href: '/dashboard/requests?status=ABERTO', description: 'Ver pedidos abertos' },
    { label: 'Disponível em P1', value: stats.p1Count, icon: Server, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', href: '/dashboard/titles?p1=true', description: 'Ver títulos no P1' },
    { label: 'Disponível em P2', value: stats.p2Count, icon: Server, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', href: '/dashboard/titles?p2=true', description: 'Ver títulos no P2' },
    { label: 'Filmes', value: stats.movies, icon: Film, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', href: '/dashboard/titles?type=MOVIE', description: 'Ver todos os filmes' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do catálogo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className={"bg-card border rounded-xl p-6 " + card.bg + " hover:scale-[1.02] transition-all cursor-pointer group"}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground transition-colors">{card.description} →</p>
              </div>
              <div className={"p-2 rounded-lg bg-card border " + card.bg}>
                <card.icon className={"w-5 h-5 " + card.color} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Open Requests */}
      <div className="space-y-8">

        {/* Movies */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🎬 Pedidos Abertos — Filmes
              {open.movies.length > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">{open.movies.length}</span>
              )}
            </h2>
            <Link href="/dashboard/requests?type=MOVIE&status=ABERTO" className="text-sm text-primary hover:underline">Ver todos →</Link>
          </div>
          {open.movies.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum pedido de filme em aberto</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {open.movies.map((r) => (
                <Link key={r.id} href="/dashboard/requests?type=MOVIE&status=ABERTO"
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:scale-[1.03] transition-all group">
                  <div className="aspect-[2/3] bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center relative p-3">
                    <Film className="w-10 h-10 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-center text-muted-foreground/60 line-clamp-3 font-medium">{r.requestedTitle}</p>
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium">Aberto</span>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <p className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">{r.requestedTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.createdBy.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Series */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              📺 Pedidos Abertos — Séries
              {open.series.length > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">{open.series.length}</span>
              )}
            </h2>
            <Link href="/dashboard/requests?type=TV&status=ABERTO" className="text-sm text-primary hover:underline">Ver todos →</Link>
          </div>
          {open.series.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum pedido de série em aberto</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {open.series.map((r) => (
                <Link key={r.id} href="/dashboard/requests?type=TV&status=ABERTO"
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:scale-[1.03] transition-all group">
                  <div className="aspect-[2/3] bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center relative p-3">
                    <Film className="w-10 h-10 text-muted-foreground/20 mb-2" />
                    <p className="text-xs text-center text-muted-foreground/60 line-clamp-3 font-medium">{r.requestedTitle}</p>
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium">Aberto</span>
                    </div>
                  </div>
                  <div className="p-3 border-t border-border/50">
                    <p className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">{r.requestedTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.createdBy.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
