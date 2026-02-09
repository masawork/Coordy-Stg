/**
 * 銀行振込却下API
 * POST /api/admin/pending-charges/[id]/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';

    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者チェック
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });

    if (!dbUser || dbUser.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // トランザクションを取得
    const transaction = await prisma.pointTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'トランザクションが見つかりません' }, { status: 404 });
    }

    // TRANSFERRED（振込完了報告済み）またはPENDING（旧フロー）を却下可能
    if (transaction.status !== 'TRANSFERRED' && transaction.status !== 'PENDING') {
      return NextResponse.json({ error: 'このトランザクションは既に処理済みです' }, { status: 400 });
    }

    // トランザクションステータスを却下に更新
    await prisma.pointTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        description: reason
          ? `却下: ${reason}`
          : `銀行振込申請が却下されました`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'チャージ申請を却下しました',
    });
  } catch (error: any) {
    console.error('Reject charge error:', error);
    return NextResponse.json(
      { error: error.message || '却下に失敗しました' },
      { status: 500 }
    );
  }
}
