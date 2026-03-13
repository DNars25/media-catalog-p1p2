import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  const dupes = await prisma.$queryRaw<{ tmdbId: number; cnt: bigint }[]>`
    SELECT "tmdbId", COUNT(*) as cnt
    FROM "Request"
    WHERE status != 'CONCLUIDO' AND "tmdbId" IS NOT NULL
    GROUP BY "tmdbId"
    HAVING COUNT(*) > 1
  `

  console.log(`Found ${dupes.length} tmdbId(s) with duplicate pending requests`)
  if (dupes.length === 0) return

  let totalDeleted = 0

  for (const { tmdbId } of dupes) {
    const requests = await prisma.request.findMany({
      where: { tmdbId, status: { not: 'CONCLUIDO' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, requestCount: true, requestedTitle: true, status: true, createdAt: true },
    })

    const [toKeep, ...toDelete] = requests
    const totalCount = requests.reduce((sum, r) => sum + (r.requestCount ?? 1), 0)

    console.log(`  tmdbId=${tmdbId} "${toKeep.requestedTitle}": ${requests.length} records → keep ${toKeep.id}, requestCount=${totalCount}`)

    await prisma.request.update({ where: { id: toKeep.id }, data: { requestCount: totalCount } })
    await prisma.request.deleteMany({ where: { id: { in: toDelete.map(r => r.id) } } })

    totalDeleted += toDelete.length
  }

  console.log(`Done. Deleted ${totalDeleted} duplicate(s).`)
}

cleanup().catch(console.error).finally(() => prisma.$disconnect())
