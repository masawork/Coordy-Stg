/**
 * 期限切れ振込申請のクリーンアップAPI
 * POST /api/admin/pending-charges/cleanup
 *
 * ========================================
 * ロジック説明
 * ========================================
 *
 * 【目的】
 * 4桁の振込コードの衝突を防ぐため、30日以上経過した未処理の振込申請を
 * 自動的に期限切れ（FAILED）にする
 *
 * 【振込コードの仕組み】
 * - 振込コードは4桁（0001〜9999）の数字
 * - ユーザーが銀行振込時に備考欄に記載する
 * - 管理者がコードと金額で振込を特定して承認する
 *
 * 【衝突防止の仕組み】
 * 1. 新規振込申請時: 過去30日間の未処理分（TRANSFERRED/PENDING）と重複チェック
 * 2. 30日経過後: 自動的にFAILEDに変更 → 同じコードが再利用可能に
 *
 * 【ステータスの流れ】
 * - TRANSFERRED: 振込完了報告済み、管理者確認待ち
 * - COMPLETED: 管理者が承認、ポイント付与済み
 * - FAILED: 管理者が却下、または30日経過で自動キャンセル
 *
 * 【呼び出しタイミング】
 * - 管理者が承認待ち一覧を表示した時
 * - 新しい振込申請が作成された時
 *
 * ========================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TransactionStatus } from '@prisma/client';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 30日以上経過した未処理の振込申請を検索
  const expiredTransactions = await prisma.pointTransaction.findMany({
    where: {
      method: 'bank_transfer',
      status: TransactionStatus.TRANSFERRED,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  // 各トランザクションを個別に更新（description を保持するため）
  let expiredCount = 0;
  for (const tx of expiredTransactions) {
    await prisma.pointTransaction.update({
      where: { id: tx.id },
      data: {
        status: TransactionStatus.FAILED,
        description: `${tx.description || ''} [30日経過により自動キャンセル]`,
      },
    });
    expiredCount++;
  }

  return NextResponse.json({
    success: true,
    expiredCount,
    message: expiredCount > 0
      ? `${expiredCount}件の振込申請を期限切れ処理しました`
      : '期限切れの振込申請はありませんでした',
  });
});
