import { NextRequest } from 'next/server'

/**
 * In-memory rate limiter baseado em IP.
 *
 * ATENÇÃO: funciona corretamente em instâncias únicas (dev local, Railway, Fly.io com 1 réplica).
 * Em deploy com múltiplas réplicas (Vercel serverless / auto-scaling), use Upstash Redis como backend.
 *
 * Uso:
 *   const ip = getClientIp(req)
 *   if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
 *     return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
 *   }
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Limpeza periódica para evitar crescimento ilimitado do Map
let lastClean = Date.now()
function maybeClean() {
  const now = Date.now()
  if (now - lastClean < 60_000) return
  lastClean = now
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key)
  })
}

/**
 * Retorna `true` se a requisição está dentro do limite, `false` se deve ser bloqueada.
 * @param key   Chave única (ex: `"login:127.0.0.1"`)
 * @param limit Número máximo de requisições permitidas na janela
 * @param windowMs Tamanho da janela em milissegundos
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  maybeClean()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

/** Extrai o IP real do cliente de headers padrão de proxy/CDN */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
