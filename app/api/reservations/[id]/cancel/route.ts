/**
 * 予約キャンセルAPI
 * PATCH /api/reservations/[id]/cancel
 *
 * ユーザーまたはインストラクターが予約をキャンセル
 * ポイント決済の場合は返金処理を行う
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * 予約キャンセル
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

    // Prisma User を取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
      include: { instructor: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません'
          }
        },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    // 予約を取得
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        service: true,
        user: true,
        instructor: true,
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

    // 権限チェック: 予約者本人 または インストラクター
    const isOwner = reservation.userId === dbUser.id;
    const isInstructor = dbUser.instructor && reservation.instructorId === dbUser.instructor.id;

    if (!isOwner && !isInstructor) {
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

    // ステータスチェック: PENDING または CONFIRMED のみキャンセル可能
    if (reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.CONFIRMED) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'この予約はキャンセルできません'
          }
        },
        { status: 400 }
      );
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

      // ポイント決済の場合、返金処理
      if (reservation.userId) {
        // この予約に対するUSE取引を検索
        const useTransaction = await tx.pointTransaction.findFirst({
          where: {
            userId: reservation.userId,
            type: TransactionType.USE,
            status: TransactionStatus.COMPLETED,
            description: {
              contains: reservation.service.title,
            },
            createdAt: {
              gte: new Date(reservation.createdAt.getTime() - 60000), // 予約作成の1分前から
              lte: new Date(reservation.createdAt.getTime() + 60000), // 予約作成の1分後まで
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (useTransaction) {
          // ウォレット残高を返金
          const wallet = await tx.wallet.findUnique({
            where: { userId: reservation.userId },
          });

          if (wallet) {
            await tx.wallet.update({
              where: { userId: reservation.userId },
              data: { balance: wallet.balance + useTransaction.amount },
            });

            // 返金トランザクションを作成
            await tx.pointTransaction.create({
              data: {
                userId: reservation.userId,
                type: TransactionType.CHARGE,
                amount: useTransaction.amount,
                status: TransactionStatus.COMPLETED,
                description: `予約キャンセル返金: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
              },
            });
          }
        }
      }

      return updatedReservation;
    });

    return NextResponse.json({
      success: true,
      reservation: result,
      message: '予約をキャンセルしました',
    });

  } catch (error: any) {
    console.error('Cancel reservation error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '予約のキャンセルに失敗しました',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}
