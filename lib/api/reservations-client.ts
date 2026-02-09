/**
 * 予約API クライアント側ヘルパー
 */

export interface CreateReservationInput {
  serviceId: string;
  scheduledAt: string;
  notes?: string;
  participants?: number;
  paymentMethod: 'points' | 'credit';
  paymentMethodId?: string;
}

export interface ReservationResult {
  success: boolean;
  reservation?: any;
  paymentMethod?: string;
  message?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  error?: string;
  required?: number;
  balance?: number;
}

/**
 * 予約一覧取得
 */
export async function getReservations() {
  try {
    const response = await fetch('/api/reservations', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '予約一覧の取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get reservations error:', error);
    throw error;
  }
}

/**
 * 予約作成（ポイントまたはクレジット決済）
 */
export async function createReservation(input: CreateReservationInput): Promise<ReservationResult> {
  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '予約に失敗しました',
        required: data.required,
        balance: data.balance,
      };
    }

    return data;
  } catch (error: any) {
    console.error('Create reservation error:', error);
    return {
      success: false,
      error: error.message || '予約に失敗しました',
    };
  }
}

/**
 * 予約キャンセル
 */
export async function cancelReservation(reservationId: string) {
  try {
    const response = await fetch(`/api/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '予約のキャンセルに失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Cancel reservation error:', error);
    throw error;
  }
}
