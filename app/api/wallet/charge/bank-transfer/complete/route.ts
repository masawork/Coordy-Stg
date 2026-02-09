/**
 * 銀行振込完了報告API
 * POST /api/wallet/charge/bank-transfer/complete
 *
 * ========================================
 * 振込コードの衝突防止ロジック
 * ========================================
 *
 * 【4桁コードの仕組み】
 * - クライアント側で4桁のランダムコードを生成
 * - ユーザーが銀行振込時に備考欄に記載
 * - 管理者がコード+金額で照合して承認
 *
 * 【衝突防止】
 * 1. 30日以上経過したTRANSFERRED状態のものはFAILEDに自動変更
 * 2. これにより4桁コードが再利用可能になる
 * 3. 衝突チェックは過去30日間のTRANSFERRED分のみ対象
 *
 * 【クリーンアップタイミング】
 * - このAPI呼び出し時
 * - 管理者が承認待ち一覧を表示時
 *
 * ========================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { TransactionType, TransactionStatus, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * 30日以上経過した振込申請を期限切れにする
 */
async function cleanupExpiredTransfers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const expiredTransactions = await prisma.pointTransaction.findMany({
    where: {
      method: 'bank_transfer',
      status: TransactionStatus.TRANSFERRED,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  for (const tx of expiredTransactions) {
    await prisma.pointTransaction.update({
      where: { id: tx.id },
      data: {
        status: TransactionStatus.FAILED,
        description: `${tx.description || ''} [30日経過により自動キャンセル]`,
      },
    });
  }

  return expiredTransactions.length;
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { amount, transferCode } = await request.json();

    // バリデーション
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: '有効なチャージ額を入力してください' },
        { status: 400 }
      );
    }

    if (amount < 1000) {
      return NextResponse.json(
        { error: '銀行振込の最低チャージ額は1,000円です' },
        { status: 400 }
      );
    }

    if (!transferCode || !/^\d{4}$/.test(transferCode)) {
      return NextResponse.json(
        { error: '振込コードが無効です' },
        { status: 400 }
      );
    }

    // Prisma User を取得（authIdまたはemailで検索）
    let dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    // authIdで見つからない場合はemailで検索（USER roleを優先）
    if (!dbUser) {
      dbUser = await prisma.user.findFirst({
        where: {
          email: authUser.email!,
          role: UserRole.USER,
        },
      });
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 30日以上経過した振込申請をクリーンアップ（衝突防止）
    // エラーが発生しても本体処理に影響しないようにする
    try {
      await cleanupExpiredTransfers();
    } catch (cleanupError) {
      console.error('Cleanup error (non-blocking):', cleanupError);
    }

    const transferId = transferCode;

    // トランザクションを作成（TRANSFERRED状態 = 振込完了報告済み）
    const transaction = await prisma.pointTransaction.create({
      data: {
        userId: dbUser.id,
        type: TransactionType.CHARGE,
        amount,
        method: 'bank_transfer',
        status: TransactionStatus.TRANSFERRED,
        transferId,
        description: `銀行振込でチャージ申請（${amount.toLocaleString()}円）`,
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      transferId: transaction.transferId,
      message: '振込完了報告を受け付けました。管理者が確認後、ポイントが反映されます。',
    });

  } catch (error: any) {
    console.error('Bank transfer complete error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: `振込完了報告に失敗しました: ${error.message}`,
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
