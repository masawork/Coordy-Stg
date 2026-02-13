import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// 振込手数料（円）
const TRANSFER_FEE = 250;

/**
 * 引き出し申請一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = user.id;

    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: { instructorId: userId },
      include: {
        bankAccount: {
          select: {
            bankName: true,
            branchName: true,
            accountHolderName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(withdrawalRequests);
  } catch (error: any) {
    console.error('Get withdrawal requests error:', error);
    return NextResponse.json(
      { error: '引き出し申請の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 引き出し申請を作成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = user.id;
    const { amount, bankAccountId } = await request.json();

    // バリデーション
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: '引き出し額を正しく入力してください' },
        { status: 400 }
      );
    }

    if (!bankAccountId) {
      return NextResponse.json(
        { error: '振込先の銀行口座を選択してください' },
        { status: 400 }
      );
    }

    // 最低引き出し額チェック（例: 1,000円以上）
    const MIN_WITHDRAWAL = 1000;
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `最低引き出し額は${MIN_WITHDRAWAL.toLocaleString()}円です` },
        { status: 400 }
      );
    }

    // 銀行口座の確認
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      return NextResponse.json(
        { error: '指定された銀行口座が見つかりません' },
        { status: 404 }
      );
    }

    if (!bankAccount.isVerified) {
      return NextResponse.json(
        { error: 'この銀行口座は未承認です。管理者の承認をお待ちください' },
        { status: 400 }
      );
    }

    // Walletの残高を確認
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json(
        { error: '残高が不足しています' },
        { status: 400 }
      );
    }

    // 引き出し申請を作成
    const netAmount = amount - TRANSFER_FEE;
    
    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: {
        instructorId: userId,
        amount,
        fee: TRANSFER_FEE,
        netAmount,
        bankAccountId,
        status: 'PENDING',
      },
      include: {
        bankAccount: {
          select: {
            bankName: true,
            branchName: true,
            accountHolderName: true,
          },
        },
      },
    });

    // Walletから残高を減算（申請時点で予約）
    await prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    // ポイント取引履歴を記録
    await prisma.pointTransaction.create({
      data: {
        userId,
        type: 'USE',
        amount: -amount,
        method: 'bank_transfer',
        status: 'PENDING',
        description: `引き出し申請: ${bankAccount.bankName} ${bankAccount.accountHolderName}`,
      },
    });

    return NextResponse.json(withdrawalRequest, { status: 201 });
  } catch (error: any) {
    console.error('Create withdrawal request error:', error);
    return NextResponse.json(
      { error: '引き出し申請の作成に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

