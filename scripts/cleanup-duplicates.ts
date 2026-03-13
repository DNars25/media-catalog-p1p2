import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup(titleSearch: string) {
  const requests = await prisma.request.findMany({
    where: { requestedTitle: { contains: titleSearch, mode: 'insensitive' }, isCorrection: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true, requestedTitle: true, requestCount: true, status: true, createdAt: true },
  })

  console.log(`Found ${requests.length} requests matching "${titleSearch}":`)
  requests.forEach(r =>
    console.log(`  [${r.status}] count=${r.requestCount} | ${r.createdAt.toISOString().slice(0, 10)} | ${r.id}`)
  )

  if (requests.length <= 1) {
    console.log('Nothing to clean up.')
    return
  }

  const [toKeep, ...toDelete] = requests
  const totalCount = requests.reduce((sum, r) => sum + (r.requestCount ?? 1), 0)

  await prisma.request.update({ where: { id: toKeep.id }, data: { requestCount: totalCount } })
  await prisma.request.deleteMany({ where: { id: { in: toDelete.map(r => r.id) } } })

  console.log(`✔ Kept ${toKeep.id} → requestCount = ${totalCount}`)
  console.log(`✔ Deleted ${toDelete.length} duplicate(s)`)
}

cleanup('Vingadores: Guerras Secretas')
  .catch(console.error)
  .finally(() => prisma.$disconnect())
