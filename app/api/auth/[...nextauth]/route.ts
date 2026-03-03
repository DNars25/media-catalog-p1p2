import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const handler = NextAuth(authOptions)

export function GET(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  return handler(req, ctx)
}

export function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const ip = getClientIp(req)
  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em um minuto.' },
      { status: 429 }
    )
  }
  return handler(req, ctx)
}
