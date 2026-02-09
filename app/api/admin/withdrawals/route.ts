import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 全引き出し申請を取得（管理者用）
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
    const status = searchParams.get('status');

    const where = status ? { status: status as any } : {};

    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bankAccount: {
          select: {
            bankName: true,
            bankCode: true,
            branchName: true,
            branchCode: true,
            accountNumber: true,
            accountHolderName: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(withdrawalRequests);
  } catch (error: any) {
    console.error('Get withdrawal requests (admin) error:', error);
    return NextResponse.json(
      { error: '引き出し申請の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

