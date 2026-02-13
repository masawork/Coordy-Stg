// lib/api/payment-client.ts

export interface PaymentMethod {
  id: string;
  userId: string;
  type: string;
  stripeCustomerId: string | null;
  stripePaymentMethodId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 登録済みカード一覧を取得
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const response = await fetch('/api/payment-methods', {
      method: 'GET',
      cache: 'no-store',
    });

    // 401 エラー（認証エラー）の場合は空配列を返す
    if (response.status === 401) {
      console.warn('⚠️ Payment methods: Not authenticated');
      return [];
    }

    // 404 エラー（カード情報なし）の場合も空配列を返す
    if (response.status === 404) {
      console.info('ℹ️ Payment methods: No cards registered');
      return [];
    }

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Payment methods error:', error);
      return []; // UI には表示しない
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Payment methods fetch error:', error);
    return []; // エラーを握りつぶして空配列を返す
  }
}

/**
 * カードを登録
 * @param paymentMethodId Stripe Payment Method ID
 */
export async function createPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  const response = await fetch('/api/payment-methods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentMethodId }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Create payment method error:', error);
    throw new Error(error.details || error.error || 'カードの登録に失敗しました');
  }

  return await response.json();
}

/**
 * カードを削除
 * @param paymentMethodId カードID
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'カードの削除に失敗しました');
  }
}

/**
 * デフォルトカードを設定
 * @param paymentMethodId カードID
 */
export async function setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
  const response = await fetch(`/api/payment-methods/${paymentMethodId}/default`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'デフォルトカードの設定に失敗しました');
  }

  return await response.json();
}

