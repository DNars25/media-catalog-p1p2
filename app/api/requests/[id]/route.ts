import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/rbac"
import { z } from "zod"
import { logAudit } from "@/lib/audit"
import { sendRequestStatusChanged } from "@/lib/email"
import { getTMDBDetails, TmdbTvDetails } from "@/lib/tmdb"
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

  // Auto-save to library when a request is concluded
  if (parsed.data.status === 'CONCLUIDO' && existing.status !== 'CONCLUIDO') {
    const newAudioType = parsed.data.audioType ?? existing.audioType ?? null
    const linkedId = parsed.data.linkedTitleId ?? existing.linkedTitleId

    if (linkedId) {
      // Title already in library — update status and audio
      await prisma.title.update({
        where: { id: linkedId },
        data: {
          internalStatus: 'DISPONIVEL',
          ...(newAudioType ? { audioType: newAudioType } : {}),
        },
      }).catch(() => {})
    } else if (existing.tmdbId) {
      // Title not linked — create or find it, then link
      try {
        const tmdbType = existing.type === 'MOVIE' ? 'movie' : 'tv'
        const details = await getTMDBDetails(tmdbType, existing.tmdbId)
        const tvDetails = details.type === 'TV' ? (details as TmdbTvDetails) : null

        const upserted = await prisma.title.upsert({
          where: { tmdbId_type: { tmdbId: existing.tmdbId, type: existing.type } },
          create: {
            tmdbId: existing.tmdbId,
            type: existing.type,
            title: details.title,
            overview: details.overview ?? null,
            posterUrl: details.posterUrl ?? null,
            releaseYear: details.releaseYear ?? null,
            genres: details.genres,
            internalStatus: 'DISPONIVEL',
            audioType: newAudioType ?? null,
            createdById: session!.user.id,
            ...(tvDetails && {
              tvSeasons: tvDetails.tvSeasons ?? null,
              tvEpisodes: tvDetails.tvEpisodes ?? null,
              tvStatus: tvDetails.tvStatus ?? null,
            }),
          },
          update: {
            internalStatus: 'DISPONIVEL',
            ...(newAudioType ? { audioType: newAudioType } : {}),
          },
        })

        await prisma.request.update({
          where: { id: params.id },
          data: { linkedTitleId: upserted.id },
        })
      } catch {
        // Don't fail the request if title upsert fails
      }
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