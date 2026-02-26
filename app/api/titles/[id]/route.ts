import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/rbac'
import { TitleUpdateSchema } from '@/lib/validators'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth()
  if (error) return error

  const title = await prisma.title.findUnique({
    where: { id: params.id },
    include: {
      createdBy: { select: { name: true, email: true } },
      episodes: { orderBy: [{ season: 'asc' }, { episode: 'asc' }] },
    },
  })
  if (!title) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(title)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = TitleUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.title.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const title = await prisma.title.update({
    where: { id: params.id },
    data: parsed.data,
  })

  logAudit({ entityType: 'Title', entityId: title.id, action: 'UPDATE', userId: session!.user.id, before: existing, after: title })

  return NextResponse.json(title)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const existing = await prisma.title.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.title.delete({ where: { id: params.id } })
  logAudit({ entityType: 'Title', entityId: params.id, action: 'DELETE', userId: session!.user.id, before: existing })

  return NextResponse.json({ success: true })
}
