import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const sinceParam = req.nextUrl.searchParams.get('since')
    const sinceDate = sinceParam ? new Date(sinceParam) : null
    if (sinceDate && isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Parâmetro since inválido' }, { status: 400 })
    }
    const where = sinceDate ? { createdAt: { gt: sinceDate } } : {}

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return NextResponse.json({ notifications })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
