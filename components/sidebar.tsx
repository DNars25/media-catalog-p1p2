'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import {
  Film, Tv, LayoutDashboard, PlusCircle, List, ClipboardList, Users, Settings, LogOut, ChevronRight, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/titles/new', icon: PlusCircle, label: 'Cadastrar Título' },
  { href: '/dashboard/titles', icon: List, label: 'Biblioteca' },
  { href: '/dashboard/filmes', icon: Film, label: 'Filmes' },
  { href: '/dashboard/series', icon: Tv, label: 'Séries' },
  { href: '/dashboard/requests', icon: ClipboardList, label: 'Pedidos' },
  { href: '/dashboard/atualizacoes', icon: RefreshCw, label: 'Atualizações' },
]

const adminItems = [
  { href: '/dashboard/users', icon: Users, label: 'Usuários' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (session == null || session.user == null) return
    const loadAvatar = () => {
      fetch('/api/me')
        .then(r => r.json())
        .then(d => setAvatarUrl(d.image ? d.image + '?t=' + Date.now() : null))
        .catch(() => {})
    }
    loadAvatar()
    window.addEventListener('avatar-updated', loadAvatar)
    return () => window.removeEventListener('avatar-updated', loadAvatar)
  }, [session?.user])

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Film className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight" style={{ fontFamily: 'Syne, sans-serif' }}>Nars VHD</p>
            <p className="text-xs text-muted-foreground">Gerenciador</p>
            <p className="text-xs text-muted-foreground">P1 & P2</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : (pathname || '').startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">Admin</p>
            </div>
            {adminItems.map((item) => {
              const active = (pathname || '').startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={session?.user?.name || ''} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {session?.user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
