/**
 * 取引履歴API
 * GET /api/wallet/[userId]/transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const { userId: authId } = await params;

  // 認証チェック
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // 自分のデータのみアクセス可能
  if (authId !== authUser.id) {
    return forbiddenError('権限がありません');
  }

  // Prisma User を取得
  const dbUser = await prisma.user.findFirst({
    where: { authId },
  });

  if (!dbUser) {
    return NextResponse.json([]);
  }

  // 取引履歴を取得
  const transactions = await prisma.pointTransaction.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    take: 50, // 最新50件
  });

  return NextResponse.json(transactions);
});
