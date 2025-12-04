/**
 * 管理者機能API
 */

import { getDataClient } from './data-client';
import { getClientWallet } from './wallet';

/**
 * 承認待ちのポイントチャージ一覧取得
 */
export async function getPendingCharges() {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.PointTransaction.list({
      filter: {
        type: { eq: 'charge' },
        method: { eq: 'bankTransfer' },
        status: { eq: 'pending' },
      },
    });

    if (errors) {
      console.error('Error listing pending charges:', errors);
      throw new Error('承認待ちチャージの取得に失敗しました');
    }

    // 日時順にソート（古い順）
    const sorted = (data || []).sort((a, b) =>
      new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
    );

    return sorted;
  } catch (error) {
    console.error('Get pending charges error:', error);
    throw error;
  }
}

/**
 * チャージを承認してポイントを追加
 */
export async function approveCharge(
  transactionId: string,
  clientId: string,
  amount: number
) {
  try {
    const client = getDataClient();

    // ウォレット取得
    const wallet = await getClientWallet(clientId);
    if (!wallet) {
      throw new Error('ウォレットが見つかりません');
    }

    // ウォレット残高を更新
    const newBalance = (wallet.balance || 0) + amount;
    await client.models.ClientWallet.update({
      id: wallet.id,
      balance: newBalance,
    });

    // トランザクションのステータスを更新
    const { data, errors } = await client.models.PointTransaction.update({
      id: transactionId,
      status: 'completed',
      description: '銀行振込チャージ（承認済み）',
    });

    if (errors) {
      console.error('Error approving charge:', errors);
      throw new Error('チャージ承認に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Approve charge error:', error);
    throw error;
  }
}

/**
 * チャージを却下
 */
export async function rejectCharge(transactionId: string) {
  try {
    const client = getDataClient();

    const { data, errors } = await client.models.PointTransaction.update({
      id: transactionId,
      status: 'failed',
      description: '銀行振込チャージ（却下）',
    });

    if (errors) {
      console.error('Error rejecting charge:', errors);
      throw new Error('チャージ却下に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Reject charge error:', error);
    throw error;
  }
}
