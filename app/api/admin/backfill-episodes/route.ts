import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/rbac'
import { getTMDBDetails } from '@/lib/tmdb'

export async function POST(req: NextRequest) {
  const { error } = await requireSuperAdmin()
  if (error) return error

  // Buscar todos os títulos TV que ainda não têm nenhum TitleEpisode
  const titles = await prisma.title.findMany({
    where: {
      type: 'TV',
      tvSeasons: { gt: 0 },
      episodes: { none: {} },
    },
    select: { id: true, tmdbId: true, title: true, tvSeasons: true, tvEpisodes: true },
    orderBy: { title: 'asc' },
  })

  const results: { title: string; episodes: number; status: 'ok' | 'skip' | 'error'; reason?: string }[] = []
  let totalEpisodes = 0

  for (const t of titles) {
    try {
      const tmdb = await getTMDBDetails('tv', t.tmdbId)
      const seasons: { season_number: number; episode_count: number }[] = tmdb.type === 'TV' ? tmdb.seasons : []
      const validSeasons = seasons.filter(s => s.season_number > 0 && s.episode_count > 0)

      if (validSeasons.length === 0) {
        results.push({ title: t.title, episodes: 0, status: 'skip', reason: 'Sem temporadas no TMDB' })
        continue
      }

      const episodesData = validSeasons.flatMap(s =>
        Array.from({ length: s.episode_count }, (_, i) => ({
          titleId: t.id,
          season: s.season_number,
          episode: i + 1,
        }))
      )

      await prisma.titleEpisode.createMany({
        data: episodesData,
        skipDuplicates: true,
      })

      totalEpisodes += episodesData.length
      results.push({ title: t.title, episodes: episodesData.length, status: 'ok' })

      // Pequeno delay para não sobrecarregar o TMDB
      await new Promise(r => setTimeout(r, 150))
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : 'Erro desconhecido'
      results.push({ title: t.title, episodes: 0, status: 'error', reason })
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const skipped = results.filter(r => r.status === 'skip').length
  const errors = results.filter(r => r.status === 'error').length

  return NextResponse.json({
    summary: { processed: ok, skipped, errors, totalEpisodes, totalTitles: titles.length },
    details: results,
  })
}
