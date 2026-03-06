/**
 * ウォレットAPI - 残高取得
 * GET /api/wallet/[userId]
 *
 * Note: userId パラメータは Supabase Auth ID を期待
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, validationError, unauthorizedError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const { userId: authId } = await params; // これはSupabase Auth ID

  if (!authId) {
    return validationError('ユーザーIDが必要です');
  }

  // Supabase からユーザー情報を取得
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 認証されていない場合は401で返す
  if (authError || !user) {
    return unauthorizedError();
  }

  // リクエストされた authId と認証済みユーザーが一致するか検証
  if (authId !== user.id) {
    return forbiddenError('権限がありません');
  }

  // authId でユーザーを検索
  let dbUser = await prisma.user.findFirst({
    where: { authId },
  });

  // ユーザーが存在しない場合は作成
  if (!dbUser) {
    const role = ((user.user_metadata?.role as string | undefined)?.toUpperCase() || 'USER') as UserRole;
    dbUser = await prisma.user.create({
      data: {
        authId,
        name: user.user_metadata?.full_name || user.email || '',
        email: user.email || '',
        role,
      },
    });
  }

  // ウォレット取得または作成（Prisma User ID を使用）
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
