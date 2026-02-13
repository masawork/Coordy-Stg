/**
 * ウォレットAPI クライアント側ヘルパー
 * クライアントコンポーネントから安全に呼び出せる関数
 */

/**
 * ウォレット取得（残高確認）
 */
export async function getWallet(userId: string) {
  try {
    const response = await fetch(`/api/wallet/${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ウォレットの取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get wallet error:', error);
    throw error;
  }
}

/**
 * ポイント使用
 */
export async function usePoints(userId: string, amount: number, description: string) {
  try {
    const response = await fetch(`/api/wallet/${userId}/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ amount, description }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ポイント使用に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Use points error:', error);
    throw error;
  }
}

/**
 * クレジットカードでポイントチャージ
 */
export async function chargePointsWithCard(amount: number, paymentMethodId?: string) {
  try {
    const response = await fetch('/api/wallet/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ amount, paymentMethodId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'チャージに失敗しました');
    }

    return data;
  } catch (error: any) {
    console.error('Charge with card error:', error);
    throw error;
  }
}

/**
 * 銀行振込でポイントチャージ申請
 */
export async function chargePointsWithBankTransfer(amount: number) {
  try {
    const response = await fetch('/api/wallet/charge/bank-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '振込申請に失敗しました');
    }

    return data;
  } catch (error: any) {
    console.error('Bank transfer charge error:', error);
    throw error;
  }
}

/**
 * 銀行振込完了報告（トランザクションを作成）
 */
export async function reportBankTransferComplete(amount: number, transferCode: string) {
  try {
    const response = await fetch('/api/wallet/charge/bank-transfer/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ amount, transferCode }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API Error Response:', data);
      throw new Error(data.error || '振込完了報告に失敗しました');
    }

    return data;
  } catch (error: any) {
    console.error('Report bank transfer complete error:', error);
    throw error;
  }
}

/**
 * 取引履歴取得
 */
export async function getTransactionHistory(userId: string) {
  try {
    const response = await fetch(`/api/wallet/${userId}/transactions`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '取引履歴の取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    throw error;
  }
}

/**
 * 登録済みカード一覧取得
 */
export async function getPaymentMethods() {
  try {
    const response = await fetch('/api/payment-methods', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'カード情報の取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    throw error;
  }
}

