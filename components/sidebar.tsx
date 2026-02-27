'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Film, Tv, LayoutDashboard, PlusCircle, List, ClipboardList, Users, Settings, LogOut, ChevronRight, RefreshCw, Menu, X, AlertTriangle, Database, BarChart2, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/titles/new', icon: PlusCircle, label: 'Cadastrar Título' },
  { href: '/dashboard/titles', icon: List, label: 'Biblioteca' },
  { href: '/dashboard/filmes', icon: Film, label: 'Filmes' },
  { href: '/dashboard/series', icon: Tv, label: 'Séries' },
  { href: '/dashboard/requests', icon: ClipboardList, label: 'Pedidos' },
  { href: '/dashboard/atualizacoes', icon: RefreshCw, label: 'Atualizações' },
  { href: '/dashboard/correcoes', icon: AlertTriangle, label: 'Correções' },
  { href: '/dashboard/tmdb', icon: Database, label: 'TMDB · Capa+Data' },
]
const adminItems = [
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
]
const superAdminItems = [
  { href: '/dashboard/users', icon: Users, label: 'Usuários' },
  { href: '/dashboard/admin/audit', icon: ClipboardCheck, label: 'Audit Log' },
]
export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role ?? '')
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (session == null || session.user == null) return
    const loadAvatar = () => {
      fetch('/api/me').then(r => r.json()).then(d => setAvatarUrl(d.image ? d.image + '?t=' + Date.now() : null)).catch(() => {})
    }
    loadAvatar()
    window.addEventListener('avatar-updated', loadAvatar)
    return () => window.removeEventListener('avatar-updated', loadAvatar)
  }, [session?.user])
  useEffect(() => { setOpen(false) }, [pathname])
  const toggleOpen = () => setOpen(prev => prev === true ? false : true)
  const NavLinks = () => (
    <nav className='flex-1 p-3 space-y-1 overflow-y-auto'>
      {navItems.map((item) => {
        const active = item.href === '/dashboard' ? pathname === '/dashboard' : (pathname || '').startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
            <item.icon className='w-4 h-4 shrink-0' />
            {item.label}
            {active && <ChevronRight className='w-3 h-3 ml-auto' />}
          </Link>
        )
      })}
      {isAdmin && (
        <>
          <div className='pt-3 pb-1'><p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3'>Admin</p></div>
          {adminItems.map((item) => {
            const active = (pathname || '').startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                <item.icon className='w-4 h-4 shrink-0' />
                {item.label}
              </Link>
            )
          })}
          {isSuperAdmin && superAdminItems.map((item) => {
            const active = (pathname || '').startsWith(item.href)
            return (
              <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary')}>
                <item.icon className='w-4 h-4 shrink-0' />
                {item.label}
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
  const UserFooter = () => (
    <div className='p-3 border-t border-border'>
      <div className='flex items-center gap-3 px-3 py-2 rounded-lg mb-1'>
        {avatarUrl ? <img src={avatarUrl} alt={session?.user?.name || ''} className='w-8 h-8 rounded-full object-cover' /> : <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold'>{session?.user?.name?.charAt(0).toUpperCase()}</div>}
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium truncate'>{session?.user?.name}</p>
          <p className='text-xs text-muted-foreground truncate'>{session?.user?.role}</p>
        </div>
      </div>
      <button onClick={() => signOut({ callbackUrl: '/login' })} className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all'>
        <LogOut className='w-4 h-4' />
        Sair
      </button>
    </div>
  )
  return (
    <div>
      <div className='md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 border-b border-border' style={{ backgroundColor: '#050d18' }}>
        <img src='/nars-logo.png' alt='Encoding Solutions' className='h-8 w-auto object-contain' />
        <button onClick={toggleOpen} className='text-white p-2 rounded-lg hover:bg-white/10 transition-colors' aria-label="Menu">
          <Menu className='w-6 h-6' />
        </button>
      </div>
      {open && <div className='md:hidden fixed inset-0 z-40 bg-black/60' onClick={toggleOpen} />}
      <div className={cn('md:hidden fixed top-0 left-0 h-full w-[85vw] max-w-72 z-50 transform transition-transform duration-300 flex flex-col', open ? 'translate-x-0' : '-translate-x-full')} style={{ backgroundColor: '#050d18' }}>
        <div className='border-b border-white/10 flex items-center justify-between px-4 py-2.5'>
          <img src='/nars-logo.png' alt='Encoding Solutions' className='h-8 w-auto object-contain' />
          <button onClick={toggleOpen} className='text-white p-2 rounded-lg hover:bg-white/10 transition-colors' aria-label="Fechar menu">
            <X className='w-6 h-6' />
          </button>
        </div>
        <NavLinks />
        <UserFooter />
      </div>
      <aside className='hidden md:flex w-64 min-h-screen border-r border-white/10 flex-col' style={{ backgroundColor: '#050d18' }}>
        <div className='border-b border-white/10 flex items-center justify-center' style={{ backgroundColor: '#050d18' }}>
          <img src='/nars-logo.png' alt='Encoding Solutions' className='w-full object-cover' style={{ height: '100px', objectPosition: 'center' }} />
        </div>
        <NavLinks />
        <UserFooter />
      </aside>
    </div>
  )
}