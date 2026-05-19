/**
 * 予約キャンセルAPI
 * PATCH /api/reservations/[id]/cancel
 *
 * ユーザーまたはインストラクターが予約をキャンセル
 * ポイント決済の場合は返金処理を行う
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus, UserRole } from '@prisma/client';
import { getAuthUser } from '@/lib/api/auth';
import {
  notFoundError,
  forbiddenError,
  validationError,
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

  const { dbUser, authUser } = authResult;

  // 同一authIdの全ユーザーレコードを取得（マルチロール対応）
  const allUserRecords = await prisma.user.findMany({
    where: { authId: authUser.id },
    select: { id: true, role: true },
  });
  const allUserIds = allUserRecords.map(u => u.id);

  // インストラクター情報を取得（権限チェック用）
  const instructorUser = allUserRecords.find(u => u.role === UserRole.INSTRUCTOR);
  const instructor = instructorUser
    ? await prisma.instructor.findUnique({ where: { userId: instructorUser.id } })
    : null;

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

  // 権限チェック: 予約者本人 または インストラクター（マルチロール対応）
  const isOwner = reservation.userId && allUserIds.includes(reservation.userId);
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

    // 返金処理: reservationId で取引を特定（ゲスト予約にも対応）
    const creditChargeTransaction = await tx.pointTransaction.findFirst({
      where: {
        reservationId: reservation.id,
        type: TransactionType.CHARGE,
        method: 'credit',
        status: TransactionStatus.COMPLETED,
      },
    });

    if (creditChargeTransaction?.transferId) {
      // Stripe経由のクレジット返金（ゲスト・登録ユーザー共通）
      try {
        await refundPaymentIntent(creditChargeTransaction.transferId, creditChargeTransaction.amount);

        await tx.pointTransaction.create({
          data: {
            userId: creditChargeTransaction.userId,
            type: TransactionType.CHARGE,
            amount: creditChargeTransaction.amount,
            method: 'credit_refund',
            status: TransactionStatus.COMPLETED,
            reservationId: reservation.id,
            description: `クレジットカード返金: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
          },
        });
      } catch (stripeError) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        console.error('Stripe refund failed:', {
          reservationId: reservation.id,
          paymentIntentId: creditChargeTransaction.transferId,
          amount: creditChargeTransaction.amount,
          error: errorMessage,
        });

        // 管理者向け通知を作成（Stripe返金失敗の可視化）
        await tx.notification.create({
          data: {
            type: 'SYSTEM',
            category: 'alert',
            title: 'Stripe返金失敗',
            message: `【要対応】予約 ${reservation.id} のクレジット返金（${creditChargeTransaction.amount}円）がStripeで失敗しました。${reservation.userId ? 'ポイントで補填済み。' : 'ゲスト予約のため手動対応が必要です。'}理由: ${errorMessage}`,
          },
        });

        // Stripe返金失敗時、登録ユーザーならポイントで補填
        if (reservation.userId) {
          const wallet = await tx.wallet.findUnique({
            where: { userId: reservation.userId },
          });
          if (wallet) {
            await tx.wallet.update({
              where: { userId: reservation.userId },
              data: { balance: { increment: creditChargeTransaction.amount } },
            });
            await tx.pointTransaction.create({
              data: {
                userId: reservation.userId,
                type: TransactionType.CHARGE,
                amount: creditChargeTransaction.amount,
                status: TransactionStatus.COMPLETED,
                reservationId: reservation.id,
                description: `予約キャンセル返金（ポイント）: ${reservation.service.title}（クレジット返金失敗のためポイント返金）`,
              },
            });
          }
        }
      }
    } else if (reservation.userId) {
      // ポイント返金: reservationId で USE 取引を特定
      const useTransaction = await tx.pointTransaction.findFirst({
        where: {
          reservationId: reservation.id,
          type: TransactionType.USE,
          status: TransactionStatus.COMPLETED,
        },
      });

      if (useTransaction) {
        const wallet = await tx.wallet.findUnique({
          where: { userId: reservation.userId },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { userId: reservation.userId },
            data: { balance: { increment: useTransaction.amount } },
          });

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

  // キャンセルメール送信（非同期）
  const cancelledBy = isOwner ? 'user' as const : 'instructor' as const;
  // 返金額の取得
  const refundTx = await prisma.pointTransaction.findFirst({
    where: {
      reservationId: id,
      type: TransactionType.CHARGE,
      description: { contains: '返金' },
    },
    orderBy: { createdAt: 'desc' },
  });

  const refundMethod = refundTx?.method === 'credit_refund' ? 'クレジットカード' : 'ポイント';

  if (reservation.user?.email) {
    sendCancellationConfirmationEmail({
      reservationId: id,
      userName: reservation.user.name || reservation.user.email,
      userEmail: reservation.user.email,
      serviceName: reservation.service.title,
      instructorName: reservation.instructor?.user?.name || 'サービス提供者',
      scheduledAt: reservation.scheduledAt,
      cancelReason: reason,
      cancelledBy,
      refundAmount: refundTx?.amount,
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
      instructorName: reservation.instructor.user.name || 'サービス提供者',
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
    reservation: result,
    message: '予約をキャンセルしました',
  });
});
