/**
 * サービス別スケジュールAPI
 * GET /api/schedules/service/[serviceId]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ReservationStatus } from '@prisma/client';
import { withErrorHandler, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 特定サービスのスケジュール取得
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) => {
  const { serviceId } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // 日付範囲のデフォルト（今日から2週間）
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // サービス情報を取得
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
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
      schedules: {
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
          isCancelled: false,
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' },
        ],
      },
      reservations: {
        where: {
          scheduledAt: {
            gte: fromDate,
            lte: toDate,
          },
          status: {
            in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          },
        },
      },
    },
  });

  if (!service) {
    return notFoundError('サービス');
  }

  // カスタムスケジュールをフォーマット
  const customSchedules = service.schedules.map((schedule) => ({
    id: schedule.id,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    isGenerated: false,
    availableSlots: service.maxParticipants - service.reservations.filter(
      (r) => {
        const rDate = new Date(r.scheduledAt);
        return rDate.toDateString() === new Date(schedule.date).toDateString() &&
               rDate.getHours().toString().padStart(2, '0') + ':' +
               rDate.getMinutes().toString().padStart(2, '0') === schedule.startTime;
      }
    ).length,
  }));

  // 繰り返しサービスからスケジュールを生成
  const generatedSchedules: any[] = [];

  if (service.recurrenceType !== 'ONCE' && service.startTime && service.availableDays.length > 0) {
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];

      if (service.availableDays.includes(dayName)) {
        const isValid =
          (!service.validFrom || currentDate >= new Date(service.validFrom)) &&
          (!service.validUntil || currentDate <= new Date(service.validUntil));

        if (isValid) {
          const dateStr = currentDate.toISOString().split('T')[0];

          const hasCustom = customSchedules.some(
            (s) => new Date(s.date).toDateString() === currentDate.toDateString() &&
                   s.startTime === service.startTime
          );

          if (!hasCustom) {
            const reservedCount = service.reservations.filter((r) => {
              const rDate = new Date(r.scheduledAt);
              return rDate.toDateString() === currentDate.toDateString() &&
                     rDate.getHours().toString().padStart(2, '0') + ':' +
                     rDate.getMinutes().toString().padStart(2, '0') === service.startTime;
            }).length;

            generatedSchedules.push({
              id: `generated-${serviceId}-${dateStr}`,
              date: new Date(currentDate),
              startTime: service.startTime,
              endTime: service.endTime || '',
              isGenerated: true,
              availableSlots: service.maxParticipants - reservedCount,
            });
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // 結合してソート
  const allSchedules = [...customSchedules, ...generatedSchedules].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  return NextResponse.json({
    service: {
      id: service.id,
      title: service.title,
      description: service.description,
      category: service.category,
      price: service.price,
      duration: service.duration,
      maxParticipants: service.maxParticipants,
      instructor: {
        id: service.instructor.id,
        name: service.instructor.user.name,
        image: service.instructor.user.image,
      },
    },
    schedules: allSchedules,
  });
});
