import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 引き出し申請を承認/却下（管理者用）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者権限チェック（email + role で検索）
    const user = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
        role: 'ADMIN',
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { action, rejectedReason } = await request.json();

    // 引き出し申請を取得
    const withdrawalRequest = await prisma.withdrawalRequest.findUnique({
      where: { id },
    });

    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: '引き出し申請が見つかりません' },
        { status: 404 }
      );
    }

    // アクション別処理
    if (action === 'approve') {
      // 承認はPENDING状態のみ可能
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'すでに処理済みです' },
          { status: 400 }
        );
      }
      // 承認
      const updated = await prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...updated,
        message: '引き出し申請を承認しました',
      });
    } else if (action === 'reject') {
      // 却下はPENDING状態のみ可能
      if (withdrawalRequest.status !== 'PENDING') {
        return NextResponse.json(
          { error: 'すでに処理済みです' },
          { status: 400 }
        );
      }
      // 却下
      if (!rejectedReason) {
        return NextResponse.json(
          { error: '却下理由を入力してください' },
          { status: 400 }
        );
      }

      // 却下時は残高を返金
      await prisma.wallet.update({
        where: { userId: withdrawalRequest.instructorId },
        data: {
          balance: {
            increment: withdrawalRequest.amount,
          },
        },
      });

      // ポイント取引履歴を更新
      await prisma.pointTransaction.updateMany({
        where: {
          userId: withdrawalRequest.instructorId,
          description: {
            contains: '引き出し申請',
          },
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
        },
      });

      const updated = await prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedReason,
          processedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...updated,
        message: '引き出し申請を却下しました',
      });
    } else if (action === 'complete') {
      // 振込完了
      if (withdrawalRequest.status !== 'APPROVED') {
        return NextResponse.json(
          { error: '承認済みの申請のみ完了できます' },
          { status: 400 }
        );
      }

      // ポイント取引履歴を更新
      await prisma.pointTransaction.updateMany({
        where: {
          userId: withdrawalRequest.instructorId,
          description: {
            contains: '引き出し申請',
          },
          status: 'PENDING',
        },
        data: {
          status: 'COMPLETED',
        },
      });

      const updated = await prisma.withdrawalRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        ...updated,
        message: '振込完了にしました',
      });
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Update withdrawal request (admin) error:', error);
    return NextResponse.json(
      { error: '引き出し申請の更新に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

