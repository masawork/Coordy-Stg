/**
 * ウォレット関連のAPI操作
 */

import { getDataClient } from './data-client';

/**
 * ウォレット取得（残高確認）
 */
export async function getClientWallet(clientId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.ClientWallet.list({
      filter: { clientId: { eq: clientId } },
    });

    if (errors) {
      console.error('Error getting wallet:', errors);
      return null;
    }

    // ウォレットが存在しない場合は作成
    if (!data || data.length === 0) {
      return await createClientWallet(clientId);
    }

    return data[0];
  } catch (error) {
    console.error('Get wallet error:', error);
    return null;
  }
}

/**
 * ウォレット作成
 */
export async function createClientWallet(clientId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.ClientWallet.create({
      clientId,
      balance: 0,
    });

    if (errors) {
      console.error('Error creating wallet:', errors);
      throw new Error('ウォレットの作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Create wallet error:', error);
    throw error;
  }
}

/**
 * ポイントチャージ
 */
export async function chargePoints(
  clientId: string,
  amount: number,
  method: 'credit' | 'bankTransfer'
) {
  try {
    const client = getDataClient();

    // 現在の残高を取得
    const wallet = await getClientWallet(clientId);
    if (!wallet) {
      throw new Error('ウォレットが見つかりません');
    }

    // 残高を更新
    const newBalance = (wallet.balance || 0) + amount;
    const { data: updatedWallet, errors: walletErrors } =
      await client.models.ClientWallet.update({
        id: wallet.id,
        balance: newBalance,
      });

    if (walletErrors) {
      console.error('Error updating wallet:', walletErrors);
      throw new Error('残高の更新に失敗しました');
    }

    // 取引履歴を作成
    const { data: transaction, errors: transactionErrors } =
      await client.models.PointTransaction.create({
        clientId,
        type: 'charge',
        amount,
        method,
        status: method === 'credit' ? 'completed' : 'pending',
        description: `${method === 'credit' ? 'クレジットカード' : '銀行振込'}でチャージ`,
      });

    if (transactionErrors) {
      console.error('Error creating transaction:', transactionErrors);
    }

    return updatedWallet;
  } catch (error) {
    console.error('Charge points error:', error);
    throw error;
  }
}

/**
 * ポイント使用
 */
export async function usePoints(
  clientId: string,
  amount: number,
  description: string
) {
  try {
    const client = getDataClient();

    // 現在の残高を取得
    const wallet = await getClientWallet(clientId);
    if (!wallet) {
      throw new Error('ウォレットが見つかりません');
    }

    // 残高チェック
    if ((wallet.balance || 0) < amount) {
      throw new Error('残高が不足しています');
    }

    // 残高を更新
    const newBalance = (wallet.balance || 0) - amount;
    const { data: updatedWallet, errors: walletErrors } =
      await client.models.ClientWallet.update({
        id: wallet.id,
        balance: newBalance,
      });

    if (walletErrors) {
      console.error('Error updating wallet:', walletErrors);
      throw new Error('残高の更新に失敗しました');
    }

    // 取引履歴を作成
    const { data: transaction, errors: transactionErrors } =
      await client.models.PointTransaction.create({
        clientId,
        type: 'use',
        amount,
        status: 'completed',
        description,
      });

    if (transactionErrors) {
      console.error('Error creating transaction:', transactionErrors);
    }

    return updatedWallet;
  } catch (error) {
    console.error('Use points error:', error);
    throw error;
  }
}

/**
 * 取引履歴取得
 */
export async function getTransactionHistory(clientId: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.PointTransaction.list({
      filter: { clientId: { eq: clientId } },
    });

    if (errors) {
      console.error('Error getting transactions:', errors);
      return [];
    }

    // 日付で降順ソート
    return (data || []).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return [];
  }
}
