/**
 * Google連携状態確認・解除API
 * GET /api/google/status - 連携状態を確認
 * DELETE /api/google/status - 連携を解除
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  if (!instructor) {
    return NextResponse.json({ connected: false });
  }

  const connected = !!(
    instructor.googleAccessToken && instructor.googleRefreshToken
  );

  return NextResponse.json({ connected });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  if (!instructor) {
    return notFoundError('インストラクター');
  }

  // Google連携を解除
  await prisma.instructor.update({
    where: { id: instructor.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
    },
  });

  return NextResponse.json({ success: true, message: 'Google連携を解除しました' });
});
