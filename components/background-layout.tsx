'use client'
import { useEffect, useState } from 'react'

export function BackgroundLayout() {
  const [bg, setBg] = useState('')
  useEffect(() => {
    const n = Math.random() > 0.5 ? '1' : '2'
    setBg('/layout/Layout-' + n + '.png')
  }, [])
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        backgroundImage: 'url(' + bg + ')',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.07
      }}
    />
  )
}
