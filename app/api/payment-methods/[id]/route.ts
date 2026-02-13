import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { detachPaymentMethod } from '@/lib/stripe/helpers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * カード削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const userId = user.id;

    // カード情報を取得
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'カードが見つかりません' },
        { status: 404 }
      );
    }

    if (paymentMethod.userId !== userId) {
      return NextResponse.json(
        { error: 'このカードを削除する権限がありません' },
        { status: 403 }
      );
    }

    // Stripeから削除
    if (paymentMethod.stripePaymentMethodId) {
      await detachPaymentMethod(paymentMethod.stripePaymentMethodId);
    }

    // Prismaから削除
    await prisma.paymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete payment method error:', error);
    return NextResponse.json(
      { error: 'カードの削除に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

