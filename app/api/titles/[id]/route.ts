import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/rbac'
import { TitleUpdateSchema } from '@/lib/validators'

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
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = TitleUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const title = await prisma.title.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(title)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.title.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
