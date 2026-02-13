/**
 * 銀行振込承認待ち一覧API
 * GET /api/admin/pending-charges
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@prisma/client';
import { decrypt } from '@/lib/utils/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    // 承認待ちの銀行振込チャージ一覧を取得（TRANSFERRED = 振込完了報告済み）
    const transactions = await prisma.pointTransaction.findMany({
      where: {
        type: 'CHARGE',
        method: 'bank_transfer',
        status: 'TRANSFERRED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            bankAccounts: {
              where: { isDefault: true },
              take: 1,
              select: {
                bankName: true,
                branchName: true,
                accountType: true,
                accountNumber: true,
                accountHolderName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 口座番号を復号化
    const transactionsWithDecryptedAccount = transactions.map((tx) => ({
      ...tx,
      user: tx.user ? {
        ...tx.user,
        bankAccounts: tx.user.bankAccounts.map((account) => ({
          ...account,
          accountNumber: account.accountNumber ? decrypt(account.accountNumber) : null,
        })),
      } : null,
    }));

    return NextResponse.json(transactionsWithDecryptedAccount);
  } catch (error: any) {
    console.error('List pending charges error:', error);
    return NextResponse.json(
      { error: '承認待ちチャージの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
