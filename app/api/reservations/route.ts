/**
 * 予約API
 * GET /api/reservations - 予約一覧取得
 * POST /api/reservations - 予約作成（ポイントまたはクレジット決済）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { createPaymentIntent } from '@/lib/stripe/helpers';
import { createMeetEvent } from '@/lib/google/meet';

export const dynamic = 'force-dynamic';

/**
 * 予約一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Prisma User を取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json([]);
    }

    const reservations = await prisma.reservation.findMany({
      where: { userId: dbUser.id },
      include: {
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

  } catch (error: any) {
    console.error('Get reservations error:', error);
    return NextResponse.json(
      { error: '予約一覧の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * 予約作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: 'サービスIDと予約日時は必須です' },
        { status: 400 }
      );
    }

    // Prisma User を取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // サービスを取得
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { instructor: true },
    });

    if (!service) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 });
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
        return NextResponse.json(
          { error: 'クレジットカードが登録されていません' },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: '決済に失敗しました' },
          { status: 400 }
        );
      }

      // トランザクションで予約作成と取引記録を作成
      const result = await prisma.$transaction(async (tx) => {
        // 予約作成
        const reservation = await tx.reservation.create({
          data: {
            userId: dbUser.id,
            serviceId,
            instructorId: service.instructorId,
            scheduledAt: new Date(scheduledAt),
            notes,
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
        // チャージ記録
        await tx.pointTransaction.create({
          data: {
            userId: dbUser.id,
            type: TransactionType.CHARGE,
            amount: totalPrice,
            method: 'credit',
            status: TransactionStatus.COMPLETED,
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
            description: `サービス予約: ${service.title}`,
          },
        });

        return reservation;
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

      return NextResponse.json({
        success: true,
        reservation: { ...result, meetUrl },
        paymentMethod: 'credit',
        message: 'クレジットカードで決済し、予約が完了しました',
      }, { status: 201 });

    } else {
      // ポイント決済
      // ウォレット残高を確認
      const wallet = await prisma.wallet.findUnique({
        where: { userId: dbUser.id },
      });

      if (!wallet || wallet.balance < totalPrice) {
        return NextResponse.json(
          {
            error: 'ポイント残高が不足しています',
            required: totalPrice,
            balance: wallet?.balance || 0,
          },
          { status: 400 }
        );
      }

      // トランザクションで予約作成とポイント使用
      const result = await prisma.$transaction(async (tx) => {
        // 予約作成
        const reservation = await tx.reservation.create({
          data: {
            userId: dbUser.id,
            serviceId,
            instructorId: service.instructorId,
            scheduledAt: new Date(scheduledAt),
            notes,
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

        // ポイント使用
        await tx.wallet.update({
          where: { userId: dbUser.id },
          data: { balance: wallet.balance - totalPrice },
        });

        // 取引履歴を作成
        await tx.pointTransaction.create({
          data: {
            userId: dbUser.id,
            type: TransactionType.USE,
            amount: totalPrice,
            status: TransactionStatus.COMPLETED,
            description: `サービス予約: ${service.title}`,
          },
        });

        return reservation;
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

      return NextResponse.json({
        success: true,
        reservation: { ...result, meetUrl },
        paymentMethod: 'points',
        message: 'ポイントで決済し、予約が完了しました',
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Create reservation error:', error);

    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'カード決済に失敗しました: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '予約に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
