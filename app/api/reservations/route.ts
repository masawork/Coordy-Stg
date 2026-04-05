/**
 * 予約API
 * GET /api/reservations - 予約一覧取得
 * POST /api/reservations - 予約作成（ポイントまたはクレジット決済）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { createPaymentIntent } from '@/lib/stripe/helpers';
import { createMeetEvent } from '@/lib/google/meet';
import { getAuthUser } from '@/lib/api/auth';
import {
  validationError,
  notFoundError,
  insufficientBalanceError,
  withErrorHandler,
} from '@/lib/api/errors';
import {
  sendReservationConfirmationEmail,
  sendReservationNotifyInstructorEmail,
} from '@/lib/mail/reservation';

export const dynamic = 'force-dynamic';

/**
 * 予約一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');

  // インストラクターとして予約を取得する場合
  const where: Record<string, unknown> = {};

  if (role === 'instructor') {
    // インストラクターIDを取得
    const instructor = await prisma.instructor.findUnique({
      where: { userId: dbUser.id },
    });
    if (!instructor) {
      return notFoundError('サービス提供者');
    }
    where.instructorId = instructor.id;
  } else {
    where.userId = dbUser.id;
  }

  if (status) {
    where.status = status;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      guestUser: true,
      service: true,
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
    orderBy: { scheduledAt: 'desc' },
  });

  return NextResponse.json(reservations);
});

/**
 * 予約作成
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  const {
    serviceId,
    scheduledAt,
    notes,
    participants = 1,
    paymentMethod, // 'points' | 'credit'
    paymentMethodId, // クレジット決済の場合
  } = await request.json();

  // バリデーション
  if (!serviceId || !scheduledAt) {
    return validationError('サービスIDと予約日時は必須です');
  }

  if (participants < 1) {
    return validationError('participants は1以上である必要があります');
  }

  // サービスを取得
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { instructor: true },
  });

  if (!service) {
    return notFoundError('サービス');
  }

  // 公開中のサービスのみ予約可能
  if ((service as Record<string, unknown>).publishStatus !== 'PUBLISHED') {
    return validationError('このサービスは現在予約を受け付けていません');
  }

  if (!service.isActive) {
    return validationError('このサービスは現在利用できません');
  }

  if (participants > service.maxParticipants) {
    return validationError(`最大定員は${service.maxParticipants}名です`);
  }

  const totalPrice = service.price * participants;

  // 支払い方法に応じて処理
  if (paymentMethod === 'credit') {
    // クレジットカード直接決済
    let pmToUse;

    if (paymentMethodId) {
      pmToUse = await prisma.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId: dbUser.id },
      });
    } else {
      pmToUse = await prisma.paymentMethod.findFirst({
        where: { userId: dbUser.id, isDefault: true },
      });
    }

    if (!pmToUse || !pmToUse.stripeCustomerId || !pmToUse.stripePaymentMethodId) {
      return validationError('クレジットカードが登録されていません');
    }

    // Stripe PaymentIntent を作成
    const paymentIntent = await createPaymentIntent(
      totalPrice,
      pmToUse.stripeCustomerId,
      pmToUse.stripePaymentMethodId,
      {
        userId: dbUser.id,
        serviceId,
        type: 'reservation',
      }
    );

    if (paymentIntent.status !== 'succeeded') {
      if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_confirmation') {
        return NextResponse.json({
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          message: '追加の認証が必要です',
        });
      }
      return validationError('決済に失敗しました');
    }

    // トランザクションで予約作成と取引記録を作成
    const result = await prisma.$transaction(async (tx) => {
      // 容量チェック（トランザクション内で再チェック）
      const existingBookings = await tx.reservation.aggregate({
        where: {
          serviceId,
          scheduledAt: new Date(scheduledAt),
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        },
        _sum: { participants: true },
      });

      const currentBooked = existingBookings._sum.participants || 0;
      if (currentBooked + participants > service.maxParticipants) {
        throw new Error('NO_AVAILABILITY');
      }

      // 予約作成
      const reservation = await tx.reservation.create({
        data: {
          userId: dbUser.id,
          serviceId,
          instructorId: service.instructorId,
          scheduledAt: new Date(scheduledAt),
          notes,
          participants,
          status: ReservationStatus.CONFIRMED,
        },
        include: {
          service: true,
          instructor: {
            include: {
              user: {
                select: { name: true, image: true },
              },
            },
          },
        },
      });

      // 取引履歴を作成（クレジット決済 → チャージ → 使用の2レコード）
      // チャージ記録（PaymentIntent IDを返金用にtransferIdに保存）
      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: TransactionType.CHARGE,
          amount: totalPrice,
          method: 'credit',
          status: TransactionStatus.COMPLETED,
          reservationId: reservation.id,
          transferId: paymentIntent.id,
          description: `予約時クレジット決済（${service.title}）`,
        },
      });

      // 使用記録
      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: TransactionType.USE,
          amount: totalPrice,
          status: TransactionStatus.COMPLETED,
          reservationId: reservation.id,
          description: `サービス予約: ${service.title}`,
        },
      });

      return reservation;
    }).catch((error) => {
      if (error.message === 'NO_AVAILABILITY') {
        throw new Error('NO_AVAILABILITY');
      }
      throw error;
    });

    // オンラインサービスの場合、Google Meet URLを生成
    let meetUrl: string | null = null;
    if (service.deliveryType === 'remote' || service.deliveryType === 'hybrid') {
      const endTime = new Date(new Date(scheduledAt).getTime() + service.duration * 60 * 1000);
      meetUrl = await createMeetEvent({
        instructorId: service.instructorId,
        summary: `[Coordy] ${service.title}`,
        description: `予約者: ${dbUser.name || dbUser.email}\n${notes || ''}`,
        startTime: new Date(scheduledAt),
        endTime,
        attendeeEmails: dbUser.email ? [dbUser.email] : undefined,
      });

      if (meetUrl) {
        await prisma.reservation.update({
          where: { id: result.id },
          data: { meetUrl },
        });
      }
    }

    // メール送信（非同期、失敗してもエラーにしない）
    const emailData = {
      reservationId: result.id,
      userName: dbUser.name || dbUser.email,
      userEmail: dbUser.email,
      serviceName: service.title,
      instructorName: result.instructor?.user?.name || 'サービス提供者',
      scheduledAt: new Date(scheduledAt),
      duration: service.duration,
      location: service.location || undefined,
      deliveryType: service.deliveryType || 'remote',
      meetUrl: meetUrl,
      price: totalPrice,
      participants,
      paymentMethod: 'credit',
    };
    sendReservationConfirmationEmail(emailData).catch((err) =>
      console.error('Failed to send confirmation email:', err)
    );
    // インストラクターへ通知
    const instructorUser = await prisma.user.findUnique({
      where: { id: service.instructor.userId },
      select: { email: true },
    });
    if (instructorUser?.email) {
      sendReservationNotifyInstructorEmail({
        ...emailData,
        instructorEmail: instructorUser.email,
      }).catch((err) =>
        console.error('Failed to send instructor notification email:', err)
      );
    }

    return NextResponse.json({
      success: true,
      reservation: { ...result, meetUrl },
      paymentMethod: 'credit',
      message: 'クレジットカードで決済し、予約が完了しました',
    }, { status: 201 });

  } else {
    // ポイント決済
    // トランザクションで予約作成とポイント使用
    const result = await prisma.$transaction(async (tx) => {
      // ウォレット残高を確認（トランザクション内で確認）
      const wallet = await tx.wallet.findUnique({
        where: { userId: dbUser.id },
      });

      if (!wallet || wallet.balance < totalPrice) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // 容量チェック（トランザクション内で再チェック）
      const existingBookings = await tx.reservation.aggregate({
        where: {
          serviceId,
          scheduledAt: new Date(scheduledAt),
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
        },
        _sum: { participants: true },
      });

      const currentBooked = existingBookings._sum.participants || 0;
      if (currentBooked + participants > service.maxParticipants) {
        throw new Error('NO_AVAILABILITY');
      }

      // 予約作成
      const reservation = await tx.reservation.create({
        data: {
          userId: dbUser.id,
          serviceId,
          instructorId: service.instructorId,
          scheduledAt: new Date(scheduledAt),
          notes,
          participants,
          status: ReservationStatus.PENDING,
        },
        include: {
          service: true,
          instructor: {
            include: {
              user: {
                select: { name: true, image: true },
              },
            },
          },
        },
      });

      // ポイント使用（decrementオペレータを使用）
      await tx.wallet.update({
        where: { userId: dbUser.id },
        data: { balance: { decrement: totalPrice } },
      });

      // 取引履歴を作成
      await tx.pointTransaction.create({
        data: {
          userId: dbUser.id,
          type: TransactionType.USE,
          amount: totalPrice,
          status: TransactionStatus.COMPLETED,
          reservationId: reservation.id,
          description: `サービス予約: ${service.title}`,
        },
      });

      return reservation;
    }).catch((error) => {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      if (error.message === 'NO_AVAILABILITY') {
        throw new Error('NO_AVAILABILITY');
      }
      throw error;
    });

    // オンラインサービスの場合、Google Meet URLを生成
    let meetUrl: string | null = null;
    if (service.deliveryType === 'remote' || service.deliveryType === 'hybrid') {
      const endTime = new Date(new Date(scheduledAt).getTime() + service.duration * 60 * 1000);
      meetUrl = await createMeetEvent({
        instructorId: service.instructorId,
        summary: `[Coordy] ${service.title}`,
        description: `予約者: ${dbUser.name || dbUser.email}\n${notes || ''}`,
        startTime: new Date(scheduledAt),
        endTime,
        attendeeEmails: dbUser.email ? [dbUser.email] : undefined,
      });

      if (meetUrl) {
        await prisma.reservation.update({
          where: { id: result.id },
          data: { meetUrl },
        });
      }
    }

    // メール送信（非同期、失敗してもエラーにしない）
    const emailDataPoints = {
      reservationId: result.id,
      userName: dbUser.name || dbUser.email,
      userEmail: dbUser.email,
      serviceName: service.title,
      instructorName: result.instructor?.user?.name || 'サービス提供者',
      scheduledAt: new Date(scheduledAt),
      duration: service.duration,
      location: service.location || undefined,
      deliveryType: service.deliveryType || 'remote',
      meetUrl: meetUrl,
      price: totalPrice,
      participants,
      paymentMethod: 'points',
    };
    sendReservationConfirmationEmail(emailDataPoints).catch((err) =>
      console.error('Failed to send confirmation email:', err)
    );
    // インストラクターへ通知
    const instructorUserPoints = await prisma.user.findUnique({
      where: { id: service.instructor.userId },
      select: { email: true },
    });
    if (instructorUserPoints?.email) {
      sendReservationNotifyInstructorEmail({
        ...emailDataPoints,
        instructorEmail: instructorUserPoints.email,
      }).catch((err) =>
        console.error('Failed to send instructor notification email:', err)
      );
    }

    return NextResponse.json({
      success: true,
      reservation: { ...result, meetUrl },
      paymentMethod: 'points',
      message: 'ポイントで決済し、予約が完了しました',
    }, { status: 201 });
  }
});
