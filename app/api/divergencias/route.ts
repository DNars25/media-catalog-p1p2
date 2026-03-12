import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  // Busca títulos onde p2Divergence não é nulo usando raw query para evitar problemas de tipo
  const titles = await prisma.$queryRaw<any[]>`
    SELECT id, title, "posterUrl", "tvSeasons", "tvEpisodes", "tvStatus", 
           "hasP1", "hasP2", "audioType", "p2Divergence", "updatedAt"
    FROM "Title"
    WHERE type = 'TV' AND "p2Divergence" IS NOT NULL
    ORDER BY "updatedAt" DESC
    LIMIT ${limit} OFFSET ${skip}
  `;

  const totalResult = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Title"
    WHERE type = 'TV' AND "p2Divergence" IS NOT NULL
  `;

  const total = Number(totalResult[0].count);

  return NextResponse.json({ 
    titles, 
    total, 
    page, 
    pages: Math.ceil(total / limit) 
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, tvSeasons, tvEpisodes } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const current = await prisma.title.findUnique({
    where: { id },
    select: { tvSeasons: true, tvEpisodes: true, p2Divergence: true },
  });

  // Usa raw query para setar NULL no campo JSON
  if (tvSeasons !== undefined && tvEpisodes !== undefined) {
    await prisma.$executeRaw`
      UPDATE "Title"
      SET "p2Divergence" = NULL, "tvSeasons" = ${tvSeasons}, "tvEpisodes" = ${tvEpisodes}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
  } else {
    await prisma.$executeRaw`
      UPDATE "Title"
      SET "p2Divergence" = NULL, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
  }

  await logAudit({
    entityType: 'DIVERGENCIA',
    action: 'RESOLVER_DIVERGENCIA',
    entityId: id,
    userId: session.user.id,
    before: { tvSeasons: current?.tvSeasons, tvEpisodes: current?.tvEpisodes, p2Divergence: current?.p2Divergence },
    after: tvSeasons !== undefined ? { tvSeasons, tvEpisodes, p2Divergence: null } : { p2Divergence: null },
  });

  const updated = await prisma.title.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
