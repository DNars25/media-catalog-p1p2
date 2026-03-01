import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'
import { Prisma } from '@prisma/client'
import { LimparConcluidosSchema } from '@/lib/validators'

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSuperAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = LimparConcluidosSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Escopo inválido' }, { status: 400 })

  const { scope } = parsed.data
  const where: Prisma.RequestWhereInput = { status: 'CONCLUIDO' }

  if (scope === 'corrections') {
    where.isCorrection = true
  } else if (scope === 'requests') {
    where.isCorrection = false
    where.isUpdate = false
  } else if (scope === 'atualizacoes') {
    where.isUpdate = true
  }

  try {
    const { count } = await prisma.request.deleteMany({ where })

    logAudit({
      entityType: 'Request',
      entityId: scope,
      action: 'BULK_DELETE_CONCLUIDOS',
      userId: session!.user.id,
      after: { scope, deleted: count },
    })

    return NextResponse.json({ deleted: count })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
