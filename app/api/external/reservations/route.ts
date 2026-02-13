/**
 * POST /api/external/reservations
 * 外部連携による予約作成
 * - ゲスト予約対応
 * - 外部決済済み対応
 * - Webhook通知対応
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPartnerRequest } from '@/lib/partner/auth';
import { sendWebhookNotification, buildReservationWebhookData } from '@/lib/partner/webhook';
import { ReservationStatus, PaymentMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // ヘッダーからパートナー認証情報を取得
    const partnerId = request.headers.get('x-partner-id');
    const ts = request.headers.get('x-timestamp');
    const sig = request.headers.get('x-signature');

    if (!partnerId || !ts || !sig) {
      return NextResponse.json(
        { error: 'MISSING_AUTH_HEADERS' },
        { status: 400 },
      );
    }

    const timestamp = parseInt(ts, 10);
    const verifyResult = await verifyPartnerRequest(partnerId, timestamp, sig);

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: verifyResult.error },
        { status: 401 },
      );
    }

    const partner = verifyResult.partner!;

    const body = await request.json();
    const {
      serviceId,
      scheduleId,
      scheduledAt,
      participants = 1,
      guest,
      paymentMode: requestedPaymentMode,
      externalPaymentRef,
      externalRef,
      notes,
    } = body;

    // バリデーション
    if (!serviceId || !scheduledAt) {
      return NextResponse.json(
        { error: 'serviceIdとscheduledAtは必須です' },
        { status: 400 },
      );
    }

    if (!guest || !guest.email || !guest.name) {
      return NextResponse.json(
        { error: 'ゲスト情報（email, name）は必須です' },
        { status: 400 },
      );
    }

    if (partner.requirePhone && !guest.phoneNumber) {
      return NextResponse.json(
        { error: 'このパートナーでは電話番号が必須です' },
        { status: 400 },
      );
    }

    // サービスの存在・許可チェック
    if (partner.serviceIds.length > 0 && !partner.serviceIds.includes(serviceId)) {
      return NextResponse.json(
        { error: 'SERVICE_NOT_ALLOWED' },
        { status: 403 },
      );
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
      include: { instructor: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'SERVICE_NOT_FOUND' },
        { status: 404 },
      );
    }

    // インストラクター制限チェック
    if (
      partner.instructorIds.length > 0 &&
      !partner.instructorIds.includes(service.instructorId)
    ) {
      return NextResponse.json(
        { error: 'SERVICE_NOT_ALLOWED' },
        { status: 403 },
      );
    }

    // 定員チェック
    const existingBookings = await prisma.reservation.aggregate({
      where: {
        serviceId,
        scheduledAt: new Date(scheduledAt),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      _sum: { participants: true },
    });

    const currentBooked = existingBookings._sum.participants || 0;
    if (currentBooked + participants > service.maxParticipants) {
      return NextResponse.json(
        {
          error: 'NO_AVAILABILITY',
          remainingCapacity: service.maxParticipants - currentBooked,
        },
        { status: 409 },
      );
    }

    // 決済モード判定
    const actualPaymentMode =
      requestedPaymentMode === 'EXTERNAL' &&
      (partner.paymentMode === 'EXTERNAL' || partner.paymentMode === 'BOTH')
        ? PaymentMode.EXTERNAL
        : PaymentMode.COORDY;

    // 予約ステータス判定
    const reservationStatus =
      actualPaymentMode === PaymentMode.EXTERNAL
        ? ReservationStatus.CONFIRMED // 外部決済済みは即CONFIRMED
        : ReservationStatus.PENDING;

    const totalAmount = service.price * participants;
    const commissionAmount = Math.floor(totalAmount * partner.commissionRate);

    // トランザクションで予約作成
    const result = await prisma.$transaction(async (tx) => {
      // ゲストユーザー作成 or 既存検索
      let guestUser = await tx.guestUser.findFirst({
        where: { email: guest.email },
      });

      if (!guestUser) {
        guestUser = await tx.guestUser.create({
          data: {
            email: guest.email,
            name: guest.name,
            phoneNumber: guest.phoneNumber || null,
          },
        });
      } else {
        // 名前・電話番号が更新されていれば更新
        guestUser = await tx.guestUser.update({
          where: { id: guestUser.id },
          data: {
            name: guest.name,
            phoneNumber: guest.phoneNumber || guestUser.phoneNumber,
          },
        });
      }

      // 予約作成
      const reservation = await tx.reservation.create({
        data: {
          serviceId,
          instructorId: service.instructorId,
          scheduledAt: new Date(scheduledAt),
          status: reservationStatus,
          notes: notes || null,
          participants,
          guestUserId: guestUser.id,
        },
        include: {
          service: true,
          instructor: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      });

      // 外部予約追跡レコード作成
      const externalReservation = await tx.externalReservation.create({
        data: {
          partnerId: partner.id,
          reservationId: reservation.id,
          externalRef: externalRef || null,
          paymentMode: actualPaymentMode,
          externalPaymentRef: externalPaymentRef || null,
          commissionRate: partner.commissionRate,
          commissionAmount,
        },
      });

      return { reservation, externalReservation, guestUser };
    });

    // Webhook通知（非同期、失敗してもエラーにしない）
    if (partner.webhookUrl && partner.webhookSecret) {
      const webhookData = buildReservationWebhookData({
        reservationId: result.reservation.id,
        externalRef,
        status: result.reservation.status,
        service: {
          id: service.id,
          title: service.title,
        },
        scheduledAt: result.reservation.scheduledAt.toISOString(),
        participants,
        guest: {
          name: result.guestUser.name,
          email: result.guestUser.email,
        },
        totalAmount,
        commissionAmount,
        paymentMode: actualPaymentMode,
      });

      // Fire and forget
      sendWebhookNotification(
        partner.webhookUrl,
        partner.webhookSecret,
        'reservation.created',
        webhookData,
      ).catch((err) => console.error('Webhook notification failed:', err));
    }

    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: result.reservation.id,
          status: result.reservation.status,
          scheduledAt: result.reservation.scheduledAt.toISOString(),
          participants,
          service: {
            id: service.id,
            title: service.title,
          },
          totalAmount,
          commission: commissionAmount,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error('External reservation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'RESERVATION_FAILED', details: message },
      { status: 500 },
    );
  }
}
