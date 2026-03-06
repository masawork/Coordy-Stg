/**
 * 管理者用予約ステータス変更API
 * PATCH /api/admin/reservations/[id]/status
 *
 * 管理者が予約ステータスを変更
 * ステータス遷移のバリデーション、ポイント返金処理を含む
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { getAuthAdmin } from '@/lib/api/auth';
import {
  notFoundError,
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';
import { sendAndLogWebhook, buildReservationWebhookData, type WebhookEvent } from '@/lib/partner/webhook';

export const dynamic = 'force-dynamic';

// ステータス遷移ルール
const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED],
  [ReservationStatus.COMPLETED]: [], // 完了後は変更不可
  [ReservationStatus.CANCELLED]: [], // キャンセル後は変更不可
};

/**
 * 管理者用予約ステータス変更
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { id } = await params;
  const body = await request.json();
  const { status, reason } = body;

  // バリデーション
  if (!status || !Object.values(ReservationStatus).includes(status)) {
    return validationError('有効なステータスを指定してください');
  }

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

  // 同じステータスへの変更はスキップ
  if (reservation.status === status) {
    return NextResponse.json({
      success: true,
      reservation,
      message: 'ステータスは既に指定された値です',
    });
  }

  // ステータス遷移の妥当性チェック
  const allowedStatuses = ALLOWED_TRANSITIONS[reservation.status];
  if (!allowedStatuses.includes(status)) {
    return validationError(`${reservation.status}から${status}への遷移は許可されていません`);
  }

  // トランザクションでステータス更新
  const result = await prisma.$transaction(async (tx) => {
    // ステータスを更新
    const updatedReservation = await tx.reservation.update({
      where: { id },
      data: {
        status: status as ReservationStatus,
        notes: reason
          ? `${reservation.notes ? reservation.notes + '\n\n' : ''}管理者変更: ${reason}`
          : reservation.notes,
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

    // キャンセルの場合、ポイント返金処理（reservationIdで特定）
    if (status === ReservationStatus.CANCELLED && reservation.userId) {
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
              description: `管理者による予約キャンセル返金: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
            },
          });
        }
      }
    }

    return updatedReservation;
  });

  // 外部予約の場合、パートナーにWebhook通知
  const webhookEventMap: Record<string, WebhookEvent> = {
    [ReservationStatus.CANCELLED]: 'reservation.cancelled',
    [ReservationStatus.COMPLETED]: 'reservation.completed',
  };
  const webhookEvent = webhookEventMap[status];
  if (webhookEvent) {
    const externalReservation = await prisma.externalReservation.findUnique({
      where: { reservationId: id },
      include: { partner: true },
    });
    if (externalReservation?.partner.webhookUrl && externalReservation.partner.webhookSecret) {
      const webhookData = buildReservationWebhookData({
        reservationId: id,
        externalRef: externalReservation.externalRef,
        status,
        service: { id: reservation.service.id, title: reservation.service.title },
        scheduledAt: reservation.scheduledAt.toISOString(),
        participants: reservation.participants,
        guest: null,
        totalAmount: reservation.service.price * reservation.participants,
        commissionAmount: externalReservation.commissionAmount,
        paymentMode: externalReservation.paymentMode,
      });
      sendAndLogWebhook({
        partnerId: externalReservation.partnerId,
        reservationId: id,
        webhookUrl: externalReservation.partner.webhookUrl,
        webhookSecret: externalReservation.partner.webhookSecret,
        event: webhookEvent,
        data: webhookData,
      }).catch((err) => console.error('Webhook failed:', err));
    }
  }

  return NextResponse.json({
    success: true,
    reservation: result,
    message: `予約ステータスを${status}に変更しました`,
  });
});
