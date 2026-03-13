import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const [pendingThisMonth, totalCompleted] = await Promise.all([
      prisma.request.count({
        where: { status: { not: 'CONCLUIDO' }, createdAt: { gte: startOfMonth } },
      }),
      prisma.request.count({ where: { status: 'CONCLUIDO' } }),
    ])
    return NextResponse.json({ pendingThisMonth, totalCompleted })
  } catch {
    return NextResponse.json({ pendingThisMonth: 0, totalCompleted: 0 })
  }
}
