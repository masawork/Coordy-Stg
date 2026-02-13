import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { setDefaultPaymentMethod } from '@/lib/stripe/helpers';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * デフォルトカードを設定
 */
export async function PUT(
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
        { error: 'このカードを設定する権限がありません' },
        { status: 403 }
      );
    }

    // 既存のデフォルトを解除
    await prisma.paymentMethod.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // 新しいデフォルトを設定
    const updatedMethod = await prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });

    // Stripeにもデフォルトを設定
    if (paymentMethod.stripeCustomerId && paymentMethod.stripePaymentMethodId) {
      await setDefaultPaymentMethod(
        paymentMethod.stripeCustomerId,
        paymentMethod.stripePaymentMethodId
      );
    }

    return NextResponse.json(updatedMethod);
  } catch (error: any) {
    console.error('Set default payment method error:', error);
    return NextResponse.json(
      { error: 'デフォルトカードの設定に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

