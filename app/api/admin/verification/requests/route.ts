import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 本人確認申請一覧を取得（管理者用）
 * GET /api/admin/verification/requests?status=pending&limit=20&offset=0
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected', 'all'
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // ステータスによる絞り込み条件
    const where =
      status && status !== 'all' ? { status } : {};

    // 申請一覧を取得
    const requests = await prisma.identityVerificationRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clientProfile: {
              select: {
                verificationLevel: true,
                phoneNumber: true,
              },
            },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // 統計情報を取得
    const stats = await prisma.identityVerificationRequest.groupBy({
      by: ['status'],
      _count: true,
    });

    const total = await prisma.identityVerificationRequest.count();
    const pending = stats.find((s) => s.status === 'pending')?._count || 0;
    const approved = stats.find((s) => s.status === 'approved')?._count || 0;
    const rejected = stats.find((s) => s.status === 'rejected')?._count || 0;

    return NextResponse.json({
      requests,
      total,
      pending,
      approved,
      rejected,
    });
  } catch (error: any) {
    console.error('Get verification requests error:', error);
    return NextResponse.json(
      { error: '申請一覧の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

