import { prisma } from './db'

export async function findTitleIdsByText(query: string): Promise<string[]> {
  const exact = query
  const prefix = `${query}%`
  const contains = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Title"
    WHERE unaccent(lower(title)) LIKE unaccent(lower(${contains}))
       OR unaccent(lower(COALESCE(overview, ''))) LIKE unaccent(lower(${contains}))
    ORDER BY
      CASE
        WHEN unaccent(lower(title)) = unaccent(lower(${exact})) THEN 3
        WHEN unaccent(lower(title)) LIKE unaccent(lower(${prefix})) THEN 2
        WHEN unaccent(lower(title)) LIKE unaccent(lower(${contains})) THEN 1
        ELSE 0
      END DESC
    LIMIT 50
  `
  return results.map(r => r.id)
}

export async function findTitleIdsByTextAndType(query: string, type: string): Promise<string[]> {
  const exact = query
  const prefix = `${query}%`
  const contains = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Title"
    WHERE type = ${type}
      AND (
        unaccent(lower(title)) LIKE unaccent(lower(${contains}))
        OR unaccent(lower(COALESCE(overview, ''))) LIKE unaccent(lower(${contains}))
      )
    ORDER BY
      CASE
        WHEN unaccent(lower(title)) = unaccent(lower(${exact})) THEN 3
        WHEN unaccent(lower(title)) LIKE unaccent(lower(${prefix})) THEN 2
        WHEN unaccent(lower(title)) LIKE unaccent(lower(${contains})) THEN 1
        ELSE 0
      END DESC
    LIMIT 50
  `
  return results.map(r => r.id)
}

export async function findRequestIdsByText(query: string): Promise<string[]> {
  const prefix = `${query}%`
  const contains = `%${query}%`
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Request"
    WHERE unaccent(lower("requestedTitle")) LIKE unaccent(lower(${contains}))
       OR unaccent(lower(COALESCE(notes, ''))) LIKE unaccent(lower(${contains}))
    ORDER BY
      CASE
        WHEN unaccent(lower("requestedTitle")) LIKE unaccent(lower(${prefix})) THEN 2
        WHEN unaccent(lower("requestedTitle")) LIKE unaccent(lower(${contains})) THEN 1
        ELSE 0
      END DESC
    LIMIT 50
  `
  return results.map(r => r.id)
}
