/**
 * 取引履歴API
 * GET /api/wallet/[userId]/transactions
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authId } = await params;

    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 自分のデータのみアクセス可能
    if (authId !== authUser.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
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

  } catch (error: any) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: '取引履歴の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
