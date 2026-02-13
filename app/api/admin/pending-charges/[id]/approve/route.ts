/**
 * 銀行振込承認API
 * POST /api/admin/pending-charges/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;

    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者チェック
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    if (!dbUser || dbUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // トランザクションで処理
    const result = await prisma.$transaction(async (tx) => {
      // トランザクションを取得
      const transaction = await tx.pointTransaction.findUnique({
        where: { id: transactionId },
        include: { user: true },
      });

      if (!transaction) {
        throw new Error('トランザクションが見つかりません');
      }

      // TRANSFERRED（振込完了報告済み）またはPENDING（旧フロー）を承認可能
      if (transaction.status !== 'TRANSFERRED' && transaction.status !== 'PENDING') {
        throw new Error('このトランザクションは既に処理済みです');
      }

      // ウォレットを取得または作成
      let wallet = await tx.wallet.findUnique({
        where: { userId: transaction.userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: transaction.userId,
            balance: 0,
          },
        });
      }

      // 残高を更新
      const newBalance = wallet.balance + transaction.amount;
      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: newBalance },
      });

      // トランザクションステータスを更新
      await tx.pointTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          description: `銀行振込でチャージ完了（${transaction.amount.toLocaleString()}pt）`,
        },
      });

      return {
        success: true,
        newBalance,
        amount: transaction.amount,
        userName: transaction.user.name,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.amount.toLocaleString()}ptのチャージを承認しました`,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error('Approve charge error:', error);
    return NextResponse.json(
      { error: error.message || '承認に失敗しました' },
      { status: 500 }
    );
  }
}
