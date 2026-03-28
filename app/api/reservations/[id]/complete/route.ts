/**
 * 予約完了API
 * PATCH /api/reservations/[id]/complete
 *
 * インストラクターが予約を完了済みにする
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { getAuthInstructor } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
  withErrorHandler,
} from '@/lib/api/errors';
import { sendAndLogWebhook, buildReservationWebhookData } from '@/lib/partner/webhook';
import { sendCompletionEmail } from '@/lib/mail/reservation';

export const dynamic = 'force-dynamic';

/**
 * 予約完了
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

  // ステータスチェック: CONFIRMED のみ完了可能
  if (reservation.status !== ReservationStatus.CONFIRMED) {
    return validationError('この予約は完了できません。ステータスがCONFIRMEDではありません。');
  }

  // 売上金額を計算
  const revenueAmount = reservation.service.price * reservation.participants;

  // トランザクションで予約完了 + インストラクター売上入金
  const updatedReservation = await prisma.$transaction(async (tx) => {
    // 楽観的ロック: ステータスがCONFIRMEDであることを保証（二重完了防止）
    const updateResult = await tx.reservation.updateMany({
      where: {
        id,
        status: ReservationStatus.CONFIRMED,
      },
      data: {
        status: ReservationStatus.COMPLETED,
      },
    });

    if (updateResult.count === 0) {
      throw new Error('ALREADY_COMPLETED');
    }

    // 更新後の予約を取得
    const updated = await tx.reservation.findUniqueOrThrow({
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
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // インストラクターのウォレットに売上を入金
    const instructorUserId = updated.instructor?.user?.id;
    if (instructorUserId && revenueAmount > 0) {
      // ウォレットを取得（なければ作成）
      await tx.wallet.upsert({
        where: { userId: instructorUserId },
        create: { userId: instructorUserId, balance: revenueAmount },
        update: { balance: { increment: revenueAmount } },
      });

      // 売上入金の取引記録を作成
      await tx.pointTransaction.create({
        data: {
          userId: instructorUserId,
          type: TransactionType.CHARGE,
          amount: revenueAmount,
          method: 'service_revenue',
          status: TransactionStatus.COMPLETED,
          reservationId: id,
          description: `サービス売上: ${updated.service.title}（${updated.participants}名）`,
        },
      });
    }

    return updated;
  });

  // 完了メール送信（非同期）
  if (updatedReservation.user?.email) {
    sendCompletionEmail({
      reservationId: id,
      userName: updatedReservation.user.name || updatedReservation.user.email,
      userEmail: updatedReservation.user.email,
      serviceName: updatedReservation.service.title,
      instructorName: updatedReservation.instructor?.user?.name || 'インストラクター',
      scheduledAt: updatedReservation.scheduledAt,
      duration: updatedReservation.service.duration,
      price: updatedReservation.service.price * updatedReservation.participants,
      participants: updatedReservation.participants,
    }).catch((err) => console.error('Failed to send completion email:', err));
  }

  // 外部予約の場合、パートナーにWebhook通知
  const externalReservation = await prisma.externalReservation.findUnique({
    where: { reservationId: id },
    include: { partner: true },
  });
  if (externalReservation?.partner.webhookUrl && externalReservation.partner.webhookSecret) {
    const webhookData = buildReservationWebhookData({
      reservationId: id,
      externalRef: externalReservation.externalRef,
      status: 'COMPLETED',
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
      event: 'reservation.completed',
      data: webhookData,
    }).catch((err) => console.error('Webhook failed:', err));
  }

  return NextResponse.json({
    success: true,
    reservation: updatedReservation,
    message: '予約を完了しました',
  });
});
