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

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    {
      label: 'Total de Títulos',
      value: stats.totalTitles,
      icon: Film,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10 border-blue-400/20',
      href: '/dashboard/titles',
      description: 'Ver todos os títulos',
    },
    {
      label: 'Aguardando Download',
      value: stats.pendingTitles,
      icon: Download,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10 border-yellow-400/20',
      href: '/dashboard/titles?internalStatus=AGUARDANDO_DOWNLOAD',
      description: 'Ver títulos pendentes',
    },
    {
      label: 'Pedidos Abertos',
      value: stats.openRequests,
      icon: ClipboardList,
      color: 'text-red-400',
      bg: 'bg-red-400/10 border-red-400/20',
      href: '/dashboard/requests?status=ABERTO',
      description: 'Ver pedidos abertos',
    },
    {
      label: 'Disponível em P1',
      value: stats.p1Count,
      icon: Server,
      color: 'text-green-400',
      bg: 'bg-green-400/10 border-green-400/20',
      href: '/dashboard/titles?p1=true',
      description: 'Ver títulos no P1',
    },
    {
      label: 'Disponível em P2',
      value: stats.p2Count,
      icon: Server,
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
      href: '/dashboard/titles?p2=true',
      description: 'Ver títulos no P2',
    },
    {
      label: 'Filmes',
      value: stats.movies,
      icon: Film,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10 border-purple-400/20',
      href: '/dashboard/titles?type=MOVIE',
      description: 'Ver todos os filmes',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do catálogo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`bg-card border rounded-xl p-6 ${card.bg} hover:scale-[1.02] transition-all cursor-pointer group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                <p className="text-3xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
                  {card.description} →
                </p>
              </div>
              <div className={`p-2 rounded-lg bg-card border ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <Link href="/dashboard/titles" className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-all">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" /> Por Tipo
          </h3>
          <div className="space-y-3">
            <Link href="/dashboard/titles?type=MOVIE" className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Filmes</span>
                <span className="font-semibold">{stats.movies}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: stats.totalTitles ? `${(stats.movies / stats.totalTitles) * 100}%` : '0%' }} />
              </div>
            </Link>
            <Link href="/dashboard/titles?type=TV" className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Séries</span>
                <span className="font-semibold">{stats.tvShows}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: stats.totalTitles ? `${(stats.tvShows / stats.totalTitles) * 100}%` : '0%' }} />
              </div>
            </Link>
          </div>
        </Link>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Servidores
          </h3>
          <div className="space-y-3">
            <Link href="/dashboard/titles?p1=true" className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">P1</span>
                <span className="font-semibold">{stats.p1Count}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full transition-all" style={{ width: stats.totalTitles ? `${(stats.p1Count / stats.totalTitles) * 100}%` : '0%' }} />
              </div>
            </Link>
            <Link href="/dashboard/titles?p2=true" className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">P2</span>
                <span className="font-semibold">{stats.p2Count}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: stats.totalTitles ? `${(stats.p2Count / stats.totalTitles) * 100}%` : '0%' }} />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
