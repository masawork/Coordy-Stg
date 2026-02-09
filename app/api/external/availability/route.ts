/**
 * GET /api/external/availability
 * パートナー向け空き状況確認
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPartnerRequest } from '@/lib/partner/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const ts = searchParams.get('ts');
    const sig = searchParams.get('sig');
    const serviceId = searchParams.get('service_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (!partnerId || !ts || !sig || !serviceId) {
      return NextResponse.json(
        { error: 'MISSING_PARAMETERS' },
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

    // パートナーのサービス制限チェック
    if (partner.serviceIds.length > 0 && !partner.serviceIds.includes(serviceId)) {
      return NextResponse.json(
        { error: 'SERVICE_NOT_ALLOWED' },
        { status: 403 },
      );
    }

    // サービスを取得
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: 'SERVICE_NOT_FOUND' },
        { status: 404 },
      );
    }

    // 日付範囲のデフォルト（今日から30日間）
    const from = dateFrom ? new Date(dateFrom) : new Date();
    const to = dateTo
      ? new Date(dateTo)
      : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    // スケジュールを取得
    const schedules = await prisma.serviceSchedule.findMany({
      where: {
        serviceId,
        isCancelled: false,
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // 予約済み数を取得してキャパシティを計算
    const scheduleIds = schedules.map((s) => s.id);
    const existingReservations = await prisma.reservation.findMany({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        scheduledAt: true,
        participants: true,
      },
    });

    // 日付ごとの予約人数を集計
    const reservationCountBySlot = new Map<string, number>();
    for (const r of existingReservations) {
      const key = r.scheduledAt.toISOString();
      reservationCountBySlot.set(
        key,
        (reservationCountBySlot.get(key) || 0) + r.participants,
      );
    }

    // 日付ごとにグループ化
    const availabilityMap = new Map<string, Array<{
      scheduleId: string;
      startTime: string;
      endTime: string;
      available: boolean;
      remainingCapacity: number;
    }>>();

    for (const schedule of schedules) {
      const dateStr = schedule.date.toISOString().split('T')[0];
      const scheduledAtKey = new Date(
        `${dateStr}T${schedule.startTime}:00+09:00`,
      ).toISOString();

      const bookedCount = reservationCountBySlot.get(scheduledAtKey) || 0;
      const remaining = Math.max(0, service.maxParticipants - bookedCount);

      const slot = {
        scheduleId: schedule.id,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        available: remaining > 0,
        remainingCapacity: remaining,
      };

      const existing = availabilityMap.get(dateStr) || [];
      existing.push(slot);
      availabilityMap.set(dateStr, existing);
    }

    const availability = Array.from(availabilityMap.entries()).map(
      ([date, slots]) => ({
        date,
        slots,
      }),
    );

    return NextResponse.json({
      serviceId,
      maxParticipants: service.maxParticipants,
      availability,
    });
  } catch (error: unknown) {
    console.error('External availability error:', error);
    return NextResponse.json(
      { error: '空き状況の取得に失敗しました' },
      { status: 500 },
    );
  }
}
