'use client'

import { useEffect, useRef, useCallback } from 'react'

const IDLE_MS = 25 * 60 * 1000  // 25 minutos
const WARN_MS = 2 * 60 * 1000   // aviso 2 minutos antes do logout

interface IdleCallbacks {
  onWarn: () => void
  onLogout: () => void
  onActive: () => void
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const

export function useIdleTimeout({ onWarn, onLogout, onActive }: IdleCallbacks) {
  const warnTimer = useRef<ReturnType<typeof setTimeout>>()
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>()

  const reset = useCallback(() => {
    clearTimeout(warnTimer.current)
    clearTimeout(logoutTimer.current)
    onActive()
    warnTimer.current = setTimeout(onWarn, IDLE_MS - WARN_MS)
    logoutTimer.current = setTimeout(onLogout, IDLE_MS)
  }, [onWarn, onLogout, onActive])

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(warnTimer.current)
      clearTimeout(logoutTimer.current)
    }
  }, [reset])
}
