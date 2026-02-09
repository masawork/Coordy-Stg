/**
 * 予約確定API
 * PATCH /api/reservations/[id]/confirm
 *
 * インストラクターが予約を確定する
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ReservationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * 予約確定
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です'
          }
        },
        { status: 401 }
      );
    }

    // Prisma User を取得（インストラクター情報を含む）
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
      include: { instructor: true },
    });

    if (!dbUser || !dbUser.instructor) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'インストラクター権限が必要です'
          }
        },
        { status: 403 }
      );
    }

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
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: '予約が見つかりません'
          }
        },
        { status: 404 }
      );
    }

    // インストラクターチェック: この予約のインストラクター本人であること
    if (reservation.instructorId !== dbUser.instructor.id) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'この操作を行う権限がありません'
          }
        },
        { status: 403 }
      );
    }

    // ステータスチェック: PENDING のみ確定可能
    if (reservation.status !== ReservationStatus.PENDING) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'この予約は確定できません。ステータスがPENDINGではありません。'
          }
        },
        { status: 400 }
      );
    }

    // 予約を確定
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
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

    return NextResponse.json({
      success: true,
      reservation: updatedReservation,
      message: '予約を確定しました',
    });

  } catch (error: any) {
    console.error('Confirm reservation error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '予約の確定に失敗しました',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}
