import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/manage/users?role=user|instructor|admin&search=...&limit=&offset=
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as 'user' | 'instructor' | 'admin' | null;
  const search = searchParams.get('search');
  const limit = Number(searchParams.get('limit') || '50');
  const offset = Number(searchParams.get('offset') || '0');

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        clientProfile: true,
        instructor: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total });
});
