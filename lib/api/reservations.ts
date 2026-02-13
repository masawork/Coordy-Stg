/**
 * 予約関連のAPI操作（Prisma版）
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { ReservationStatus, Reservation as PrismaReservation } from '@prisma/client';

export type Reservation = PrismaReservation & {
  user?: any;
  service?: any;
  instructor?: any;
};

export interface ReservationInput {
  userId: string;
  serviceId: string;
  instructorId: string;
  scheduledAt: Date | string;
  notes?: string;
}

/**
 * 予約一覧取得
 */
export async function listReservations(filters?: {
  userId?: string;
  serviceId?: string;
  instructorId?: string;
  status?: ReservationStatus;
}) {
  try {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.serviceId) {
      where.serviceId = filters.serviceId;
    }
    if (filters?.instructorId) {
      where.instructorId = filters.instructorId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        user: true,
        service: true,
        instructor: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    return reservations;
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
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: true,
        service: {
          include: {
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    return reservation;
  } catch (error) {
    console.error('Get reservation error:', error);
    throw error;
  }
}

/**
 * 予約作成
 */
export async function createReservation(input: ReservationInput) {
  try {
    const reservation = await prisma.reservation.create({
      data: {
        userId: input.userId,
        serviceId: input.serviceId,
        instructorId: input.instructorId,
        scheduledAt: typeof input.scheduledAt === 'string' ? new Date(input.scheduledAt) : input.scheduledAt,
        notes: input.notes,
        status: ReservationStatus.PENDING,
      },
      include: {
        user: true,
        service: {
          include: {
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    return reservation;
  } catch (error: any) {
    console.error('Create reservation error:', error);
    throw new Error(`予約の作成に失敗しました: ${error.message}`);
  }
}

/**
 * 予約更新
 */
export async function updateReservation(
  id: string,
  updates: Partial<{
    status: ReservationStatus;
    notes: string;
    scheduledAt: Date | string;
  }>
) {
  try {
    const updateData: any = {};

    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }
    if (updates.scheduledAt !== undefined) {
      updateData.scheduledAt =
        typeof updates.scheduledAt === 'string' ? new Date(updates.scheduledAt) : updates.scheduledAt;
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
        service: {
          include: {
            instructor: {
              include: {
                user: true,
              },
            },
          },
        },
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    return reservation;
  } catch (error: any) {
    console.error('Update reservation error:', error);
    throw new Error(`予約の更新に失敗しました: ${error.message}`);
  }
}

/**
 * 予約キャンセル
 */
export async function cancelReservation(id: string) {
  return updateReservation(id, { status: ReservationStatus.CANCELLED });
}

/**
 * 予約削除
 */
export async function deleteReservation(id: string) {
  try {
    await prisma.reservation.delete({
      where: { id },
    });
    return { success: true };
  } catch (error: any) {
    console.error('Delete reservation error:', error);
    throw new Error(`予約の削除に失敗しました: ${error.message}`);
  }
}
