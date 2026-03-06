import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/manage/users/set-role
 * body: { userId: string, role: 'USER' | 'INSTRUCTOR' | 'ADMIN' }
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const { userId, role } = body as { userId?: string; role?: UserRole };

  if (!userId || !role) {
    return validationError('userId と role は必須です');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  return NextResponse.json({ success: true, user: updated });
});
