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
  const isBeingConcluded = parsed.data.status === 'CONCLUIDO' && existing.status !== 'CONCLUIDO'

  const request = await prisma.request.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      ...(isBeingConcluded ? { completedById: session!.user.id } : {}),
    },
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
  let savedToLibrary = false
  let saveError: string | null = null

  if (isBeingConcluded) {
    const newAudioType = parsed.data.audioType ?? existing.audioType ?? null
    const linkedId = parsed.data.linkedTitleId ?? existing.linkedTitleId

    if (linkedId) {
      const updated = await prisma.title.update({
        where: { id: linkedId },
        data: {
          internalStatus: 'DISPONIVEL',
          ...(newAudioType ? { audioType: newAudioType } : {}),
        },
      }).catch((e: unknown) => { saveError = String(e); return null })
      savedToLibrary = updated !== null
    } else if (existing.tmdbId) {
      try {
        const tmdbType = existing.type === 'MOVIE' ? 'movie' : 'tv'

        let titleName = existing.requestedTitle
        let titlePoster: string | null = existing.posterUrl ?? null
        let overview: string | null = null
        let releaseYear: number | null = null
        let genres: string[] = []
        let tvSeasons: number | null = null
        let tvEpisodes: number | null = null
        let tvStatus: 'EM_ANDAMENTO' | 'FINALIZADA' | null = null

        try {
          const details = await getTMDBDetails(tmdbType, existing.tmdbId)
          titleName = details.title || existing.requestedTitle
          titlePoster = details.posterUrl ?? existing.posterUrl ?? null
          overview = details.overview ?? null
          releaseYear = details.releaseYear ?? null
          genres = details.genres
          if (details.type === 'TV') {
            const tv = details as TmdbTvDetails
            tvSeasons = tv.tvSeasons ?? null
            tvEpisodes = tv.tvEpisodes ?? null
            tvStatus = tv.tvStatus ?? null
          }
        } catch {
          // TMDB unavailable — proceed with request data
        }

        const upserted = await prisma.title.upsert({
          where: { tmdbId_type: { tmdbId: existing.tmdbId, type: existing.type } },
          create: {
            tmdbId: existing.tmdbId,
            type: existing.type,
            title: titleName,
            overview,
            posterUrl: titlePoster,
            releaseYear,
            genres,
            internalStatus: 'DISPONIVEL',
            audioType: newAudioType ?? null,
            createdById: session!.user.id,
            ...(existing.type === 'TV' && {
              tvSeasons,
              tvEpisodes,
              ...(tvStatus && { tvStatus }),
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

        savedToLibrary = true
      } catch (e: unknown) {
        saveError = String(e)
      }
    } else {
      saveError = 'no_tmdb_id'
    }

    if (!savedToLibrary) {
      logAudit({
        entityType: 'Request',
        entityId: params.id,
        action: 'LIBRARY_SAVE_FAILED',
        userId: session!.user.id,
        after: { saveError, tmdbId: existing.tmdbId, linkedId },
      })
    }
  }

  return NextResponse.json({ ...request, savedToLibrary, saveError })
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