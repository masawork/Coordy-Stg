/**
 * ウォレット関連のAPI操作（Prisma版）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { TransactionType, TransactionStatus } from '@prisma/client';

/**
 * ウォレット取得（残高確認）
 */
export async function getWallet(userId: string) {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    // ウォレットが存在しない場合は作成
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    return wallet;
  } catch (error) {
    console.error('Get wallet error:', error);
    throw error;
  }
}

/**
 * ポイントチャージ
 */
export async function chargePoints(
  userId: string,
  amount: number,
  method: 'credit' | 'bank_transfer',
  description?: string
) {
  try {
    // トランザクション内で処理
    const result = await prisma.$transaction(async (tx) => {
      // ウォレットを取得または作成
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

    if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
          },
        });
    }

    // 残高を更新
      const newBalance = wallet.balance + amount;
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

    // 取引履歴を作成
      await tx.pointTransaction.create({
        data: {
          userId,
          type: TransactionType.CHARGE,
        amount,
        method,
          status: method === 'credit' ? TransactionStatus.COMPLETED : TransactionStatus.PENDING,
          description: description || `${method === 'credit' ? 'クレジットカード' : '銀行振込'}でチャージ`,
        },
      });

    return updatedWallet;
    });

    return result;
  } catch (error: any) {
    console.error('Charge points error:', error);
    throw new Error(`ポイントチャージに失敗しました: ${error.message}`);
  }
}

/**
 * ポイント使用
 */
export async function usePoints(userId: string, amount: number, description: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // ウォレットを取得
      const wallet = await tx.wallet.findUnique({
        where: { userId },
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
        where: { userId },
        data: { balance: newBalance },
      });

    // 取引履歴を作成
      await tx.pointTransaction.create({
        data: {
          userId,
          type: TransactionType.USE,
        amount,
          status: TransactionStatus.COMPLETED,
        description,
        },
      });

    return updatedWallet;
    });

    return result;
  } catch (error: any) {
    console.error('Use points error:', error);
    throw new Error(`ポイント使用に失敗しました: ${error.message}`);
  }
}

/**
 * 取引履歴取得
 */
export async function getTransactionHistory(userId: string) {
  try {
    const transactions = await prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions;
  } catch (error) {
    console.error('Get transaction history error:', error);
    throw error;
  }
}
