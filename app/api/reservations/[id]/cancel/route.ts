/**
 * 予約キャンセルAPI
 * PATCH /api/reservations/[id]/cancel
 *
 * ユーザーまたはインストラクターが予約をキャンセル
 * ポイント決済の場合は返金処理を行う
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 予約キャンセル
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  // インストラクター情報を取得（権限チェック用）
  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  const { id } = await params;
  const body = await request.json();
  const { reason } = body;

  // 予約を取得
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true,
      user: true,
      instructor: true,
    },
  });

  if (!reservation) {
    return notFoundError('予約');
  }

  // 権限チェック: 予約者本人 または インストラクター
  const isOwner = reservation.userId === dbUser.id;
  const isInstructor = instructor && reservation.instructorId === instructor.id;

  if (!isOwner && !isInstructor) {
    return forbiddenError();
  }

  // ステータスチェック: PENDING または CONFIRMED のみキャンセル可能
  if (reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CONFIRMED) {
    return validationError('この予約はキャンセルできません');
  }

  // トランザクションでキャンセル処理
  const result = await prisma.$transaction(async (tx) => {
    // 予約をキャンセル
    const updatedReservation = await tx.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: reason ? `${reservation.notes ? reservation.notes + '\n\n' : ''}キャンセル理由: ${reason}` : reservation.notes,
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

    // ポイント返金: reservationId で USE 取引を特定
    if (reservation.userId) {
      const useTransaction = await tx.pointTransaction.findFirst({
        where: {
          reservationId: reservation.id,
          type: TransactionType.USE,
          status: TransactionStatus.COMPLETED,
        },
      });

      if (useTransaction) {
        // ウォレット残高を返金
        const wallet = await tx.wallet.findUnique({
          where: { userId: reservation.userId },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { userId: reservation.userId },
            data: { balance: wallet.balance + useTransaction.amount },
          });

          // 返金トランザクションを作成
          await tx.pointTransaction.create({
            data: {
              userId: reservation.userId,
              type: TransactionType.CHARGE,
              amount: useTransaction.amount,
              status: TransactionStatus.COMPLETED,
              reservationId: reservation.id,
              description: `予約キャンセル返金: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
            },
          });
        }
      }
    }

    return updatedReservation;
  });

  return NextResponse.json({
    success: true,
    reservation: result,
    message: '予約をキャンセルしました',
  });
});
