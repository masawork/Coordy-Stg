/**
 * 予約完了API
 * PATCH /api/reservations/[id]/complete
 *
 * インストラクターが予約を完了済みにする
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
import { sendAndLogWebhook, buildReservationWebhookData } from '@/lib/partner/webhook';

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

  // 予約を完了
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      status: ReservationStatus.COMPLETED,
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
