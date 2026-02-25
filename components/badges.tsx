import { cn } from '@/lib/utils'

const statusConfig = {
  AGUARDANDO_DOWNLOAD: { label: 'Aguardando', class: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  DISPONIVEL: { label: 'Disponível', class: 'bg-green-400/10 text-green-400 border-green-400/20' },
  INDISPONIVEL: { label: 'Indisponível', class: 'bg-red-400/10 text-red-400 border-red-400/20' },
  ABERTO: { label: 'Aberto', class: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  EM_PROGRESSO: { label: 'Em Progresso', class: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  CONCLUIDO: { label: 'Concluído', class: 'bg-green-400/10 text-green-400 border-green-400/20' },
  REJEITADO: { label: 'Rejeitado', class: 'bg-red-400/10 text-red-400 border-red-400/20' },
  EM_ANDAMENTO: { label: 'Em Andamento', class: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  FINALIZADA: { label: 'Finalizada', class: 'bg-muted text-muted-foreground border-border' },
  MOVIE: { label: 'Filme', class: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  TV: { label: 'Série', class: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  ADMIN: { label: 'Admin', class: 'bg-primary/10 text-primary border-primary/20' },
  USER: { label: 'User', class: 'bg-muted text-muted-foreground border-border' },
}

export function Badge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status] || { label: status, class: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', config.class)}>
      {config.label}
    </span>
  )
}

const serverDisplayName: Record<string, string> = { P1: 'B2P', P2: 'P2B' }

export function PBadge({ type, active }: { type: 'P1' | 'P2'; active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border',
      active
        ? 'bg-primary/10 text-primary border-primary/20'
        : 'bg-muted text-muted-foreground border-border opacity-40'
    )}>
      {serverDisplayName[type] ?? type}
    </span>
  )
}
