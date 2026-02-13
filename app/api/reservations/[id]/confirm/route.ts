/**
 * 予約確定API
 * PATCH /api/reservations/[id]/confirm
 *
 * インストラクターが予約を確定する
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus } from '@prisma/client';
import { getAuthInstructor } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 予約確定
 */
export const PATCH = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor } = authResult;

  const { id } = await params;

  // 予約を取得
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      instructor: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!reservation) {
    return notFoundError('予約');
  }

  // インストラクターチェック: この予約のインストラクター本人であること
  if (reservation.instructorId !== instructor.id) {
    return forbiddenError();
  }

  // ステータスチェック: PENDING のみ確定可能
  if (reservation.status !== ReservationStatus.PENDING) {
    return validationError('この予約は確定できません。ステータスがPENDINGではありません。');
  }

  // 予約を確定
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      status: ReservationStatus.CONFIRMED,
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      instructor: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    reservation: updatedReservation,
    message: '予約を確定しました',
  });
});
