/**
 * スケジュールAPI
 * GET /api/schedules - スケジュール一覧取得
 * POST /api/schedules - スケジュール作成（インストラクター用）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { withErrorHandler, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * スケジュール一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const serviceId = searchParams.get('serviceId');
  const instructorId = searchParams.get('instructorId');
  const category = searchParams.get('category');

  // 日付範囲のデフォルト（今日から1ヶ月）
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // ServiceScheduleから取得
  const scheduleWhere: any = {
    date: {
      gte: fromDate,
      lte: toDate,
    },
    isCancelled: false,
  };

  if (serviceId) {
    scheduleWhere.serviceId = serviceId;
  }

  // カスタムスケジュールを取得
  const customSchedules = await prisma.serviceSchedule.findMany({
    where: scheduleWhere,
    include: {
      service: {
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
        },
      },
    },
    orderBy: [
      { date: 'asc' },
      { startTime: 'asc' },
    ],
  });

  // フィルタリング
  let filteredSchedules = customSchedules;

  if (instructorId) {
    filteredSchedules = filteredSchedules.filter(
      (s) => s.service.instructorId === instructorId
    );
  }

  if (category) {
    filteredSchedules = filteredSchedules.filter(
      (s) => s.service.category === category
    );
  }

  // 繰り返しサービスからスケジュールを生成
  const serviceWhere: any = {
    isActive: true,
    recurrenceType: { not: 'ONCE' },
  };

  if (serviceId) {
    serviceWhere.id = serviceId;
  }
  if (instructorId) {
    serviceWhere.instructorId = instructorId;
  }
  if (category) {
    serviceWhere.category = category;
  }

  const recurringServices = await prisma.service.findMany({
    where: serviceWhere,
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
    },
  });

  // 繰り返しサービスから日付範囲内のスケジュールを生成
  const generatedSchedules: any[] = [];

  for (const service of recurringServices) {
    if (!service.startTime || service.availableDays.length === 0) continue;

    // 有効期間チェック
    if (service.validFrom && new Date(service.validFrom) > toDate) continue;
    if (service.validUntil && new Date(service.validUntil) < fromDate) continue;

    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];

      if (service.availableDays.includes(dayName)) {
        const isValid =
          (!service.validFrom || currentDate >= new Date(service.validFrom)) &&
          (!service.validUntil || currentDate <= new Date(service.validUntil));

        if (isValid) {
          generatedSchedules.push({
            id: `generated-${service.id}-${currentDate.toISOString().split('T')[0]}`,
            serviceId: service.id,
            date: new Date(currentDate),
            startTime: service.startTime,
            endTime: service.endTime || '',
            isCancelled: false,
            isGenerated: true,
            service,
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // 両方のスケジュールを結合してソート
  const allSchedules = [...filteredSchedules, ...generatedSchedules].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  // 重複を排除（同じサービス・日付・時刻）
  const uniqueSchedules = allSchedules.filter((schedule, index, self) => {
    return index === self.findIndex((s) =>
      s.serviceId === schedule.serviceId &&
      new Date(s.date).toDateString() === new Date(schedule.date).toDateString() &&
      s.startTime === schedule.startTime
    );
  });

  return NextResponse.json(uniqueSchedules);
});

/**
 * スケジュール作成（インストラクター用）
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser } = authResult;

  // インストラクター情報を取得
  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  if (!instructor) {
    return forbiddenError('インストラクター権限が必要です');
  }

  const body = await request.json();
  const { serviceId, date, startTime, endTime } = body;

  if (!serviceId || !date || !startTime) {
    return validationError('サービスID、日付、開始時刻は必須です');
  }

  // サービスの所有者確認
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service || service.instructorId !== instructor.id) {
    return forbiddenError('このサービスを編集する権限がありません');
  }

  // スケジュール作成
  const schedule = await prisma.serviceSchedule.create({
    data: {
      serviceId,
      date: new Date(date),
      startTime,
      endTime: endTime || '',
    },
    include: {
      service: true,
    },
  });

  return NextResponse.json(schedule);
});
