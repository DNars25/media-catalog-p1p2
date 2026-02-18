import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/rbac'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.enum(['ABERTO', 'EM_PROGRESSO', 'CONCLUIDO', 'REJEITADO']).optional(),
  notes: z.string().optional().nullable(),
  linkedTitleId: z.string().optional().nullable(),
  audioType: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const request = await prisma.request.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(request)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  await prisma.request.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}