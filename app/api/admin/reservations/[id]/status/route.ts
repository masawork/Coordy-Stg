/**
 * 管理者用予約ステータス変更API
 * PATCH /api/admin/reservations/[id]/status
 *
 * 管理者が予約ステータスを変更
 * ステータス遷移のバリデーション、ポイント返金処理を含む
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { ReservationStatus, TransactionType, TransactionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// ステータス遷移ルール
const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.COMPLETED, ReservationStatus.CANCELLED],
  [ReservationStatus.COMPLETED]: [], // 完了後は変更不可
  [ReservationStatus.CANCELLED]: [], // キャンセル後は変更不可
};

/**
 * 管理者用予約ステータス変更
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

    // 管理者権限チェック
    const adminUser = await prisma.user.findFirst({
      where: {
        authId: authUser.id,
        role: 'ADMIN',
      },
    });

    if (!adminUser) {
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

    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    // バリデーション
    if (!status || !Object.values(ReservationStatus).includes(status)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: '有効なステータスを指定してください'
          }
        },
        { status: 400 }
      );
    }

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

    // 同じステータスへの変更はスキップ
    if (reservation.status === status) {
      return NextResponse.json({
        success: true,
        reservation,
        message: 'ステータスは既に指定された値です',
      });
    }

    // ステータス遷移の妥当性チェック
    const allowedStatuses = ALLOWED_TRANSITIONS[reservation.status];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `${reservation.status}から${status}への遷移は許可されていません`
          }
        },
        { status: 400 }
      );
    }

    // トランザクションでステータス更新
    const result = await prisma.$transaction(async (tx) => {
      // ステータスを更新
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: status as ReservationStatus,
          notes: reason
            ? `${reservation.notes ? reservation.notes + '\n\n' : ''}管理者変更: ${reason}`
            : reservation.notes,
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

      // キャンセルの場合、ポイント返金処理
      if (status === ReservationStatus.CANCELLED && reservation.userId) {
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
                description: `管理者による予約キャンセル返金: ${reservation.service.title}${reason ? ` (理由: ${reason})` : ''}`,
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
      message: `予約ステータスを${status}に変更しました`,
    });

  } catch (error: any) {
    console.error('Update reservation status error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ステータスの変更に失敗しました',
          details: error.message
        }
      },
      { status: 500 }
    );
  }
}
