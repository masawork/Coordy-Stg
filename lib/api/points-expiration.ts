/**
 * ポイント有効期限管理
 */

import { getDataClient } from './data-client';
import { getClientWallet } from './wallet';

/**
 * 有効期限切れポイントをチェックして処理
 */
export async function processExpiredPoints(clientId: string) {
  try {
    const client = getDataClient();

    // 有効期限切れのチャージトランザクションを取得
    const { data: transactions, errors } = await client.models.PointTransaction.list({
      filter: {
        clientId: { eq: clientId },
        type: { eq: 'charge' },
        status: { eq: 'completed' },
      },
    });

    if (errors) {
      console.error('Error listing transactions:', errors);
      return;
    }

    const now = new Date();
    let totalExpiredPoints = 0;

    for (const transaction of transactions || []) {
      // 有効期限があり、期限切れの場合
      if (transaction.expiresAt && new Date(transaction.expiresAt) < now) {
        // まだ処理されていない場合のみカウント
        const isAlreadyProcessed = (transactions || []).some(
          (t) =>
            t.type === 'expired' &&
            t.description?.includes(transaction.id)
        );

        if (!isAlreadyProcessed) {
          totalExpiredPoints += transaction.amount;

          // 失効レコードを作成
          await client.models.PointTransaction.create({
            clientId,
            type: 'expired',
            amount: transaction.amount,
            status: 'completed',
            description: `ポイント失効（有効期限切れ）- 元トランザクション: ${transaction.id}`,
          });
        }
      }
    }

    // ウォレット残高から失効ポイントを減算
    if (totalExpiredPoints > 0) {
      const wallet = await getClientWallet(clientId);
      if (wallet) {
        const newBalance = Math.max(0, (wallet.balance || 0) - totalExpiredPoints);
        await client.models.ClientWallet.update({
          id: wallet.id,
          balance: newBalance,
        });
      }

      return {
        processed: true,
        expiredPoints: totalExpiredPoints,
      };
    }

    return {
      processed: false,
      expiredPoints: 0,
    };
  } catch (error) {
    console.error('Process expired points error:', error);
    throw error;
  }
}

/**
 * 有効期限付きチャージ（デフォルト: 1年後）
 */
export async function chargePointsWithExpiration(
  clientId: string,
  amount: number,
  method: 'credit' | 'bankTransfer',
  expirationDays: number = 365
) {
  try {
    const client = getDataClient();

    // 有効期限を計算
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    const status = method === 'credit' ? 'completed' : 'pending';

    // ウォレット更新（クレジットカードの場合のみ）
    if (method === 'credit') {
      const wallet = await getClientWallet(clientId);
      if (wallet) {
        const newBalance = (wallet.balance || 0) + amount;
        await client.models.ClientWallet.update({
          id: wallet.id,
          balance: newBalance,
        });
      }
    }

    // トランザクション作成
    const { data, errors } = await client.models.PointTransaction.create({
      clientId,
      type: 'charge',
      amount,
      method,
      status,
      description: method === 'credit'
        ? `クレジットカードチャージ（有効期限: ${expiresAt.toLocaleDateString('ja-JP')}）`
        : `銀行振込チャージ（承認待ち、有効期限: ${expiresAt.toLocaleDateString('ja-JP')}）`,
      expiresAt: expiresAt.toISOString(),
    });

    if (errors) {
      console.error('Error creating transaction:', errors);
      throw new Error('チャージに失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Charge points with expiration error:', error);
    throw error;
  }
}

/**
 * 有効期限が近いポイントを取得
 */
export async function getExpiringPoints(clientId: string, daysThreshold: number = 30) {
  try {
    const client = getDataClient();

    const { data: transactions, errors } = await client.models.PointTransaction.list({
      filter: {
        clientId: { eq: clientId },
        type: { eq: 'charge' },
        status: { eq: 'completed' },
      },
    });

    if (errors) {
      console.error('Error listing transactions:', errors);
      return [];
    }

    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);

    const expiringTransactions = (transactions || []).filter((transaction) => {
      if (!transaction.expiresAt) return false;

      const expiresAt = new Date(transaction.expiresAt);
      return expiresAt > now && expiresAt <= threshold;
    });

    return expiringTransactions;
  } catch (error) {
    console.error('Get expiring points error:', error);
    throw error;
  }
}
