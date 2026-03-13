import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const [pendingAgg, completedAgg] = await Promise.all([
      prisma.request.aggregate({
        where: { source: 'VITRINE', status: { not: 'CONCLUIDO' }, createdAt: { gte: startOfMonth } },
        _sum: { requestCount: true },
      }),
      prisma.request.aggregate({
        where: { source: 'VITRINE', status: 'CONCLUIDO' },
        _sum: { requestCount: true },
      }),
    ])
    return NextResponse.json({
      pendingThisMonth: pendingAgg._sum.requestCount ?? 0,
      totalCompleted: completedAgg._sum.requestCount ?? 0,
    })
  } catch {
    return NextResponse.json({ pendingThisMonth: 0, totalCompleted: 0 })
  }
}
