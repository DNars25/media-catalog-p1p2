import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const [titles, total] = await Promise.all([
    db.title.findMany({
      where: {
        type: 'TV',
        p2Divergence: { not: null }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        posterUrl: true,
        tvSeasons: true,
        tvEpisodes: true,
        tvStatus: true,
        hasP1: true,
        hasP2: true,
        audioType: true,
        p2Divergence: true,
        updatedAt: true,
      }
    }),
    db.title.count({
      where: { type: 'TV', p2Divergence: { not: null } }
    })
  ]);

  return NextResponse.json({ titles, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, tvSeasons, tvEpisodes } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const updated = await db.title.update({
    where: { id },
    data: {
      p2Divergence: null,
      ...(tvSeasons !== undefined && { tvSeasons }),
      ...(tvEpisodes !== undefined && { tvEpisodes }),
    }
  });

  return NextResponse.json(updated);
}
