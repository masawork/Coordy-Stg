/**
 * 予約関連のAPI操作
 */

import { getDataClient } from './data-client';
import type { Reservation, ReservationStatus } from './data-client';

/**
 * 予約一覧取得
 */
export async function listReservations(filters?: {
  userId?: string;
  serviceId?: string;
  status?: ReservationStatus;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Reservation.list({
      filter: filters
        ? {
            ...(filters.userId && { userId: { eq: filters.userId } }),
            ...(filters.serviceId && { serviceId: { eq: filters.serviceId } }),
            ...(filters.status && { status: { eq: filters.status } }),
          }
        : undefined,
    });

    if (errors) {
      console.error('Error listing reservations:', errors);
      throw new Error('予約一覧の取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('List reservations error:', error);
    throw error;
  }
}

/**
 * 予約詳細取得
 */
export async function getReservation(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Reservation.get({ id });

    if (errors) {
      console.error('Error getting reservation:', errors);
      throw new Error('予約の取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Get reservation error:', error);
    throw error;
  }
}

/**
 * 予約作成
 */
export async function createReservation(input: {
  userId: string;
  serviceId: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  participants?: number;
  price: number;
  notes?: string;
}) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Reservation.create({
      ...input,
      status: 'pending',
    });

    if (errors) {
      console.error('Error creating reservation:', errors);
      throw new Error('予約の作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Create reservation error:', error);
    throw error;
  }
}

/**
 * 予約更新（ステータス変更など）
 */
export async function updateReservation(
  id: string,
  updates: Partial<{
    status: ReservationStatus;
    notes: string;
  }>
) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Reservation.update({
      id,
      ...updates,
    });

    if (errors) {
      console.error('Error updating reservation:', errors);
      throw new Error('予約の更新に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Update reservation error:', error);
    throw error;
  }
}

/**
 * 予約キャンセル
 */
export async function cancelReservation(id: string) {
  return updateReservation(id, { status: 'cancelled' });
}

/**
 * 予約削除
 */
export async function deleteReservation(id: string) {
  try {
    const client = getDataClient();
    const { data, errors } = await client.models.Reservation.delete({ id });

    if (errors) {
      console.error('Error deleting reservation:', errors);
      throw new Error('予約の削除に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Delete reservation error:', error);
    throw error;
  }
}
