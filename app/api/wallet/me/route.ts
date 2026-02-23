/**
 * ウォレットAPI - 現在のユーザーの残高取得
 * GET /api/wallet/me?role=user|instructor
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const role = request.nextUrl.searchParams.get('role') || 'user';
  const prismaRole = role.toUpperCase() as UserRole;

  // Supabase からユーザー情報を取得
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // email + role でユーザーを検索
  const dbUser = await prisma.user.findUnique({
    where: {
      email_role: {
        email: authUser.email!,
        role: prismaRole,
      },
    },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // ウォレット取得または作成
  let wallet = await prisma.wallet.findUnique({
    where: { userId: dbUser.id },
  });

  // ウォレットが存在しない場合は作成
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: dbUser.id,
        balance: 0,
      },
    });
  }

  return NextResponse.json(wallet);
});
