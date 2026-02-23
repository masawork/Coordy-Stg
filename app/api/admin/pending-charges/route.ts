/**
 * 銀行振込承認待ち一覧API
 * GET /api/admin/pending-charges
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { decrypt } from '@/lib/utils/encryption';
import { withErrorHandler } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

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
});
