/**
 * ウォレットAPI - ポイント使用
 * POST /api/wallet/[userId]/use
 *
 * Note: userId パラメータは Supabase Auth ID を期待
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authId } = await params; // これはSupabase Auth ID

    if (!authId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase からユーザー情報を取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストされた authId と認証済みユーザーが一致するか検証
    if (authId !== user.id) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // authId でユーザーを検索
    const dbUser = await prisma.user.findFirst({
      where: { authId },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: '有効な金額が必要です' },
        { status: 400 }
      );
    }

    // トランザクションでポイント使用処理（Prisma User ID を使用）
    const result = await prisma.$transaction(async (tx) => {
      // ウォレットを取得
      const wallet = await tx.wallet.findUnique({
        where: { userId: dbUser.id },
      });

      if (!wallet) {
        throw new Error('ウォレットが見つかりません');
      }

      // 残高チェック
      if (wallet.balance < amount) {
        throw new Error('残高が不足しています');
      }

      // 残高を更新
      const newBalance = wallet.balance - amount;
      const updatedWallet = await tx.wallet.update({
        where: { userId: dbUser.id },
        data: { balance: newBalance },
      });

      // ポイント履歴に記録
      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: 'USE',
          amount: -amount,
          description: description || 'ポイント使用',
          status: 'COMPLETED',
        },
      });

      return updatedWallet;
    });

    return NextResponse.json({
      success: true,
      wallet: result,
    });
  } catch (error: any) {
    console.error('Use points error:', error);
    return NextResponse.json(
      { error: error.message || 'ポイント使用に失敗しました' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
