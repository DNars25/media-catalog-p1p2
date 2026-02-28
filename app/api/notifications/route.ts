import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const since = req.nextUrl.searchParams.get('since')
  const where = since ? { createdAt: { gt: new Date(since) } } : {}

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ notifications })
}
