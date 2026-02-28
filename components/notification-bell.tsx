'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Package, AlertTriangle } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  createdAt: string
}

const LS_KEY = 'notif_last_seen'
const POLL_INTERVAL = 20_000

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      const notifs: Notification[] = data.notifications || []
      setNotifications(notifs)
      const lastSeen = localStorage.getItem(LS_KEY)
      const count = lastSeen
        ? notifs.filter(n => new Date(n.createdAt) > new Date(lastSeen)).length
        : notifs.length
      setUnread(count)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    setOpen(v => !v)
    if (!open) {
      localStorage.setItem(LS_KEY, new Date().toISOString())
      setUnread(0)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border shadow-xl z-50 overflow-hidden"
          style={{ backgroundColor: '#050d18' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Notificações</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Sem notificações</p>
            ) : (
              notifications.map(n => {
                const lastSeen = localStorage.getItem(LS_KEY)
                const isNew = !lastSeen || new Date(n.createdAt) > new Date(lastSeen)
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${isNew ? 'bg-orange-500/5' : ''}`}>
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${n.type === 'PEDIDO' ? 'bg-blue-500/15 text-blue-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {n.type === 'PEDIDO'
                        ? <Package className="w-3 h-3" />
                        : <AlertTriangle className="w-3 h-3" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
