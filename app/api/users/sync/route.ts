/**
 * ユーザー同期API
 * Supabase Authのユーザーを Prismaのusersテーブルに同期
 * POST /api/users/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, email, name, role } = body;

  if (!userId || !email) {
    return validationError('ユーザーIDとメールアドレスが必要です');
  }

  // 既にユーザーが存在するかチェック
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (existingUser) {
    return NextResponse.json({ user: existingUser, created: false });
  }

  // Prismaにユーザーレコードを作成
  const user = await prisma.user.create({
    data: {
      id: userId,
      email,
      name: name || email.split('@')[0],
      role: (role?.toUpperCase() as UserRole) || UserRole.USER,
    },
  });

  return NextResponse.json({ user, created: true }, { status: 201 });
});
