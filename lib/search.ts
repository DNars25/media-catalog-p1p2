import { prisma } from './db'

export async function findTitleIdsByText(query: string): Promise<string[]> {
  const q = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Title"
    WHERE unaccent(lower(title)) LIKE unaccent(lower(${q}))
       OR unaccent(lower(COALESCE(overview, ''))) LIKE unaccent(lower(${q}))
  `
  return results.map(r => r.id)
}

export async function findTitleIdsByTextAndType(query: string, type: string): Promise<string[]> {
  const q = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Title"
    WHERE type = ${type}
      AND (
        unaccent(lower(title)) LIKE unaccent(lower(${q}))
        OR unaccent(lower(COALESCE(overview, ''))) LIKE unaccent(lower(${q}))
      )
  `
  return results.map(r => r.id)
}

export async function findRequestIdsByText(query: string): Promise<string[]> {
  const q = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Request"
    WHERE unaccent(lower("requestedTitle")) LIKE unaccent(lower(${q}))
  `
  return results.map(r => r.id)
}
