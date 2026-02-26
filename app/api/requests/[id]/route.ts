import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/rbac"
import { z } from "zod"
import { logAudit } from "@/lib/audit"
import { sendRequestStatusChanged } from "@/lib/email"
const UpdateSchema = z.object({
  status: z.enum(["ABERTO", "EM_ANDAMENTO", "EM_PROGRESSO", "CONCLUIDO", "REJEITADO"]).optional(),
  notes: z.string().optional().nullable(),
  linkedTitleId: z.string().optional().nullable(),
  audioType: z.string().optional().nullable(),
  seasonNumber: z.number().optional().nullable(),
})
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const existing = await prisma.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 })
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session!.user.role)
  const isOwner = existing.createdById === session!.user.id
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const request = await prisma.request.update({
    where: { id: params.id },
    data: parsed.data,
  })

  logAudit({ entityType: 'Request', entityId: request.id, action: 'UPDATE', userId: session!.user.id, before: existing, after: request })

  if (parsed.data.status && parsed.data.status !== existing.status) {
    const creator = await prisma.user.findUnique({ where: { id: existing.createdById }, select: { email: true, name: true } })
    if (creator) {
      sendRequestStatusChanged({
        toEmail: creator.email,
        toName: creator.name ?? creator.email,
        requestTitle: existing.requestedTitle,
        oldStatus: existing.status,
        newStatus: parsed.data.status,
      })
    }
  }

  return NextResponse.json(request)
}
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const existing = await prisma.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 })
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session!.user.role)
  const isOwner = existing.createdById === session!.user.id
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
  await prisma.request.delete({ where: { id: params.id } })
  logAudit({ entityType: 'Request', entityId: params.id, action: 'DELETE', userId: session!.user.id, before: existing })
  return NextResponse.json({ success: true })
}