import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/rbac"
import { z } from "zod"
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
  const isAdmin = session!.user.role === "ADMIN"
  const isOwner = existing.createdById === session!.user.id
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
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
  const { error, session } = await requireAuth()
  if (error) return error
  const existing = await prisma.request.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 })
  const isAdmin = session!.user.role === "ADMIN"
  const isOwner = existing.createdById === session!.user.id
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
  await prisma.request.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}