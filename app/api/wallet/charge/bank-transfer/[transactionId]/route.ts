/**
 * 銀行振込ステータス更新API
 * PATCH /api/wallet/charge/bank-transfer/[transactionId]
 *
 * 振込完了報告を受け付け、ステータスをTRANSFERREDに更新
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { TransactionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Prisma User を取得
    const dbUser = await prisma.user.findFirst({
      where: { email: authUser.email! },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // トランザクションを取得
    const transaction = await prisma.pointTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: '振込申請が見つかりません' }, { status: 404 });
    }

    // 自分のトランザクションかチェック
    if (transaction.userId !== dbUser.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // ステータスチェック
    if (transaction.status !== TransactionStatus.PENDING) {
      return NextResponse.json(
        { error: 'この振込申請は既に処理済みです' },
        { status: 400 }
      );
    }

    // ステータスをTRANSFERRED（振込完了報告済み）に更新
    const updatedTransaction = await prisma.pointTransaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.TRANSFERRED,
        description: `${transaction.description} - 振込完了報告済み`,
      },
    });

    return NextResponse.json({
      success: true,
      message: '振込完了報告を受け付けました。管理者が確認後、ポイントが反映されます。',
      transaction: updatedTransaction,
    });

  } catch (error: any) {
    console.error('Bank transfer status update error:', error);
    return NextResponse.json(
      { error: 'ステータス更新に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
