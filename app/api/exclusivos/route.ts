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
  const server = searchParams.get('server'); // 'b2p' | 'p2b'
  const type = searchParams.get('type');     // 'MOVIE' | 'TV'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');
  const skip = (page - 1) * limit;

  console.log('[exclusivos] params:', { server, type, page, limit });

  if (!server || !type) {
    return NextResponse.json({ error: 'server e type são obrigatórios' }, { status: 400 });
  }

  const where = server === 'b2p'
    ? { hasP1: true, hasP2: false, type: type as 'MOVIE' | 'TV' }
    : { hasP1: false, hasP2: true, type: type as 'MOVIE' | 'TV' };

  console.log('[exclusivos] where:', where);

  const [titles, total] = await Promise.all([
    prisma.title.findMany({
      where,
      orderBy: { title: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        posterUrl: true,
        releaseYear: true,
        tvSeasons: true,
        tvEpisodes: true,
        tvStatus: true,
        audioType: true,
        hasP1: true,
        hasP2: true,
        type: true,
        internalStatus: true,
      }
    }),
    prisma.title.count({ where })
  ]);

  console.log('[exclusivos] total:', total);

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

  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id e action são obrigatórios' }, { status: 400 });

  await logAudit({
    entityType: 'MAPEAMENTO',
    action: 'RESOLVER_MAPEAMENTO',
    entityId: id,
    userId: session.user.id,
    before: { action },
    after: null,
  });

  return NextResponse.json({ ok: true });
}
