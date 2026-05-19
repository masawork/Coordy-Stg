/**
 * クレジット使用制限チェック
 * 月額クレジット使用上限を超えていないか検証
 */

import prisma from '@/lib/prisma';
import { TransactionType, TransactionStatus } from '@prisma/client';

/**
 * 当月のクレジット使用額を取得
 */
export async function getMonthlyCreditUsage(userId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await prisma.pointTransaction.aggregate({
    where: {
      userId,
      method: 'credit',
      type: TransactionType.CHARGE,
      status: TransactionStatus.COMPLETED,
      createdAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
  });

  return result._sum.amount || 0;
}

/**
 * クレジット使用制限をチェック
 * @returns null: 制限内、string: エラーメッセージ
 */
export async function checkCreditLimit(
  userId: string,
  requestedAmount: number
): Promise<{ allowed: true } | { allowed: false; message: string; monthlyUsage: number; creditLimit: number }> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });

  if (!wallet?.creditLimit) {
    return { allowed: true };
  }

  const monthlyUsage = await getMonthlyCreditUsage(userId);
  const remaining = wallet.creditLimit - monthlyUsage;

  if (requestedAmount > remaining) {
    return {
      allowed: false,
      message: `月額クレジット使用上限（¥${wallet.creditLimit.toLocaleString()}）を超えます。今月の使用額: ¥${monthlyUsage.toLocaleString()}、残り: ¥${Math.max(0, remaining).toLocaleString()}`,
      monthlyUsage,
      creditLimit: wallet.creditLimit,
    };
  }

  return { allowed: true };
}
