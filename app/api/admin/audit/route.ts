import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  try {
    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1'))
    const limit = 20
    const skip = (page - 1) * limit
    const entityType = sp.get('entityType') || ''
    const action = sp.get('action') || ''

    const where: { entityType?: string; action?: string } = {}
    if (entityType) where.entityType = entityType
    if (action) where.action = action

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ])

    return NextResponse.json({ logs, total, page, limit, pages: Math.ceil(total / limit) })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
