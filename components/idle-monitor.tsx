'use client'

import { useState, useCallback, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { Clock, LogOut } from 'lucide-react'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'

const WARN_SECS = 120 // 2 minutos de aviso antes do logout

export function IdleMonitor() {
  const [warned, setWarned] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECS)
  const countdownRef = useRef<ReturnType<typeof setInterval>>()

  const clearCountdown = useCallback(() => {
    clearInterval(countdownRef.current)
  }, [])

  const handleWarn = useCallback(() => {
    clearCountdown()
    setSecondsLeft(WARN_SECS)
    setWarned(true)
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(countdownRef.current); return 0 }
        return s - 1
      })
    }, 1000)
  }, [clearCountdown])

  const handleLogout = useCallback(() => {
    clearCountdown()
    signOut({ callbackUrl: '/login' })
  }, [clearCountdown])

  const handleActive = useCallback(() => {
    clearCountdown()
    setWarned(false)
    setSecondsLeft(WARN_SECS)
  }, [clearCountdown])

  useIdleTimeout({ onWarn: handleWarn, onLogout: handleLogout, onActive: handleActive })

  if (!warned) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdown = minutes > 0
    ? `${minutes}m ${String(seconds).padStart(2, '0')}s`
    : `${secondsLeft}s`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-7 w-full max-w-sm text-center shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-yellow-400/10 border border-yellow-400/30">
            <Clock className="w-7 h-7 text-yellow-400" />
          </div>
        </div>

        <h2 className="text-lg font-bold mb-1">Sessão prestes a expirar</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Por inatividade, você será desconectado em{' '}
          <span className="font-bold text-yellow-400">{countdown}</span>.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleActive}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            Continuar conectado
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-lg border border-border hover:bg-secondary text-sm text-muted-foreground flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair agora
          </button>
        </div>
      </div>
    </div>
  )
}
