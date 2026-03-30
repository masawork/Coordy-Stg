/**
 * 予約キャンセルAPI
 * PATCH /api/reservations/[id]/cancel
 *
 * ユーザーまたはインストラクターが予約をキャンセル
 * ポイント決済の場合はポイント返金、クレジット決済の場合はStripe返金を行う
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
  conflictError,
  withErrorHandler,
} from '@/lib/api/errors';
import { sendAndLogWebhook, buildReservationWebhookData } from '@/lib/partner/webhook';
import {
  sendCancellationConfirmationEmail,
  sendCancellationNotifyInstructorEmail,
} from '@/lib/mail/reservation';
import { refundPaymentIntent } from '@/lib/stripe/helpers';

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
      instructor: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
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

  // --- Phase 1: DBトランザクションでキャンセル + 返金情報の取得 ---
  const txResult = await prisma.$transaction(async (tx) => {
    // 楽観的ロック: ステータスがまだ有効であることを保証
    const updated = await tx.reservation.updateMany({
      where: {
        id,
        status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
      },
      data: {
        status: ReservationStatus.CANCELLED,
        notes: reason ? `${reservation.notes ? reservation.notes + '\n\n' : ''}キャンセル理由: ${reason}` : reservation.notes,
      },
    });

    if (updated.count === 0) {
      return null; // 二重キャンセル - Phase 1外で409を返す
    }

    // 返金情報を取得
    let chargeTransaction = null;
    let useTransaction = null;

    if (reservation.userId) {
      chargeTransaction = await tx.pointTransaction.findFirst({
        where: {
          reservationId: reservation.id,
          type: TransactionType.CHARGE,
          status: TransactionStatus.COMPLETED,
        },
        orderBy: { createdAt: 'desc' },
      });

      useTransaction = await tx.pointTransaction.findFirst({
        where: {
          reservationId: reservation.id,
          type: TransactionType.USE,
          status: TransactionStatus.COMPLETED,
        },
      });
    }

    return { chargeTransaction, useTransaction };
  });

  // 二重キャンセルチェック
  if (txResult === null) {
    return conflictError('この予約は既にキャンセル済みまたは完了済みです');
  }

  // --- Phase 2: Stripe返金（DB外で実行、非可逆操作） ---
  const refundAmount = txResult.useTransaction?.amount || 0;
  let refundMethod = 'ポイント';
  let stripeRefundSuccess = false;

  if (refundAmount > 0 && reservation.userId) {
    const { chargeTransaction } = txResult;

    if (chargeTransaction?.method === 'credit' && chargeTransaction.transferId) {
      // Stripe返金額はCHARGE額を上限とする（キャンペーン割引対応）
      const stripeRefundAmount = Math.min(refundAmount, chargeTransaction.amount);
      try {
        await refundPaymentIntent(chargeTransaction.transferId, stripeRefundAmount);
        refundMethod = 'クレジットカード';
        stripeRefundSuccess = true;
      } catch (stripeError: unknown) {
        // 既に返金済みの場合はポイント返金にフォールバックしない
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        if (errorMessage.includes('charge_already_refunded')) {
          console.warn('Stripe refund already processed, skipping duplicate refund');
          refundMethod = 'クレジットカード（既返金済）';
          stripeRefundSuccess = true; // ポイント返金をスキップ
        } else {
          console.error('Stripe refund failed, falling back to point refund:', stripeError);
        }
      }
    }

    // --- Phase 3: ポイント返金 + 返金記録の作成 ---
    await prisma.$transaction(async (tx) => {
      if (refundMethod === 'ポイント') {
        // ポイント返金: アトミックにウォレット残高を増加
        await tx.wallet.update({
          where: { userId: reservation.userId! },
          data: { balance: { increment: refundAmount } },
        });
      }

      // 返金トランザクションを記録
      await tx.pointTransaction.create({
        data: {
          userId: reservation.userId!,
          type: TransactionType.CHARGE,
          amount: refundAmount,
          method: stripeRefundSuccess ? 'credit_refund' : undefined,
          status: TransactionStatus.COMPLETED,
          reservationId: reservation.id,
          description: `予約キャンセル返金（${refundMethod}）: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
        },
      });
    });
  }

  // 更新後の予約を取得
  const updatedReservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true,
      user: {
        select: { id: true, name: true, email: true },
      },
      instructor: {
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
      },
    },
  });

  // キャンセルメール送信（非同期）
  const cancelledBy = isOwner ? 'user' as const : 'instructor' as const;

  if (reservation.user?.email) {
    sendCancellationConfirmationEmail({
      reservationId: id,
      userName: reservation.user.name || reservation.user.email,
      userEmail: reservation.user.email,
      serviceName: reservation.service.title,
      instructorName: reservation.instructor?.user?.name || 'インストラクター',
      scheduledAt: reservation.scheduledAt,
      cancelReason: reason,
      cancelledBy,
      refundAmount: refundAmount > 0 ? refundAmount : undefined,
      refundMethod,
    }).catch((err) => console.error('Failed to send cancellation email:', err));
  }

  // インストラクターへキャンセル通知
  if (reservation.instructor?.user?.email) {
    sendCancellationNotifyInstructorEmail({
      reservationId: id,
      userName: reservation.user?.name || 'ゲスト',
      userEmail: reservation.user?.email || '',
      serviceName: reservation.service.title,
      instructorName: reservation.instructor.user.name || 'インストラクター',
      scheduledAt: reservation.scheduledAt,
      cancelReason: reason,
      cancelledBy,
      instructorEmail: reservation.instructor.user.email,
    }).catch((err) => console.error('Failed to send instructor cancel email:', err));
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
      status: 'CANCELLED',
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
      event: 'reservation.cancelled',
      data: webhookData,
    }).catch((err) => console.error('Webhook failed:', err));
  }

  return NextResponse.json({
    success: true,
    reservation: updatedReservation,
    message: '予約をキャンセルしました',
  });
});
