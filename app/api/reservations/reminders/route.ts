/**
 * 予約リマインダー送信API
 *
 * GET /api/reservations/reminders
 *
 * 24時間以内に予定されているCONFIRMED状態の予約に対して
 * リマインダーメールを送信する。
 *
 * cronジョブまたは外部スケジューラから定期的に呼び出す想定。
 * Authorization: Bearer <CRON_SECRET> で認証。
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  sendReminderEmail,
  sendReminderInstructorEmail,
  type ReminderEmailData,
} from '@/lib/mail/reservation';

/**
 * cronジョブ認証
 * 環境変数 CRON_SECRET と一致するBearerトークンを要求
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // CRON_SECRETが設定されていない場合はスキップ（開発環境用）
    console.warn('CRON_SECRET is not set. Allowing unauthenticated access.');
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.slice(7) === cronSecret;
}

export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: '認証エラー' },
      { status: 401 }
    );
  }

  try {
    const now = new Date();
    // 24時間後
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 24時間以内に予定されているCONFIRMED予約を取得
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledAt: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        user: true,
        guestUser: true,
        service: true,
        instructor: {
          include: {
            user: true,
          },
        },
      },
    });

    let sentCount = 0;
    const errors: string[] = [];

    for (const reservation of upcomingReservations) {
      try {
        // ユーザー情報の取得（通常ユーザーまたはゲスト）
        const userName = reservation.user?.name
          || reservation.guestUser?.name
          || 'ゲスト';
        const userEmail = reservation.user?.email
          || reservation.guestUser?.email
          || null;

        if (!userEmail) {
          errors.push(`予約 ${reservation.id}: メールアドレスなし`);
          continue;
        }

        const reminderData: ReminderEmailData = {
          reservationId: reservation.id,
          userName,
          userEmail,
          serviceName: reservation.service.title,
          instructorName: reservation.instructor.user?.name || 'インストラクター',
          scheduledAt: reservation.scheduledAt,
          duration: reservation.service.duration,
          deliveryType: reservation.service.deliveryType,
          meetUrl: reservation.meetUrl,
          location: reservation.service.location || undefined,
        };

        // ユーザーへリマインダー送信
        await sendReminderEmail(reminderData);

        // インストラクターへリマインダー送信
        const instructorEmail = reservation.instructor.user?.email;
        if (instructorEmail) {
          await sendReminderInstructorEmail({
            ...reminderData,
            instructorEmail,
          });
        }

        sentCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`予約 ${reservation.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: upcomingReservations.length,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Reminder API error:', error);
    return NextResponse.json(
      { error: 'リマインダー送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
