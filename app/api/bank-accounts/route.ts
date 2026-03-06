import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { sendBankAccountCreatedEmail } from '@/lib/mail/resend';
import { withErrorHandler, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

const toHalfWidthDigits = (value: string) =>
  (value || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '');

/**
 * 銀行口座一覧取得
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser, authUser } = authResult;

  // 口座番号は暗号化されているため、マスク表示用に取得
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      accountType: true,
      bankName: true,
      bankCode: true,
      branchName: true,
      branchCode: true,
      accountNumber: true, // 暗号化済み
      accountHolderName: true,
      isVerified: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 口座番号を復号化してマスク表示用に変換
  const processedAccounts = bankAccounts.map((account) => {
    let decryptedAccountNumber = '';
    try {
      decryptedAccountNumber = decrypt(account.accountNumber);
    } catch (e) {
      console.error('Failed to decrypt account number:', e);
    }
    return {
      ...account,
      accountNumber: decryptedAccountNumber, // 復号化した口座番号（編集用）
      accountNumberMasked: decryptedAccountNumber
        ? `****${decryptedAccountNumber.slice(-4)}`
        : '****',
    };
  });

  return NextResponse.json(processedAccounts);
});

/**
 * 銀行口座登録
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser, authUser } = authResult;

  const {
    accountType,
    bankName,
    bankCode,
    branchName,
    branchCode,
    accountNumber,
    accountHolderName,
  } = await request.json();

  // 正規化（全角数字 → 半角数字、記号除去）
  const normalizedBankCode = toHalfWidthDigits(bankCode).slice(0, 4);
  const normalizedBranchCode = toHalfWidthDigits(branchCode).slice(0, 3);
  const normalizedAccountNumber = toHalfWidthDigits(accountNumber).slice(0, 7);
  const normalizedAccountHolderName = (accountHolderName || '').trim();

  // バリデーション
  if (!accountType || !bankName || !branchName || !normalizedAccountHolderName) {
    return validationError('すべての項目を入力してください');
  }

  if (normalizedBankCode.length !== 4) {
    return validationError('銀行コードは4桁の数字で入力してください');
  }

  if (normalizedBranchCode.length !== 3) {
    return validationError('支店コードは3桁の数字で入力してください');
  }

  if (normalizedAccountNumber.length !== 7) {
    return validationError('口座番号は7桁の数字で入力してください');
  }

  const katakanaRegex = /^[ァ-ヴーｦ-ﾟー・\s　]+$/;
  if (!katakanaRegex.test(normalizedAccountHolderName)) {
    return validationError('口座名義人は全角カタカナで入力してください');
  }

  // 口座番号を暗号化
  const encryptedAccountNumber = encrypt(normalizedAccountNumber);

  // 既存の口座数を確認
  const existingAccounts = await prisma.bankAccount.findMany({
    where: { userId: dbUser.id },
  });

  const isFirstAccount = existingAccounts.length === 0;

  // 銀行口座を登録
  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: dbUser.id,
      accountType,
      bankName,
      bankCode: normalizedBankCode,
      branchName,
      branchCode: normalizedBranchCode,
      accountNumber: encryptedAccountNumber,
      accountHolderName: normalizedAccountHolderName,
      isVerified: true,
      isDefault: isFirstAccount,
    },
  });

  // メール通知を送信（非同期で実行、エラーは握りつぶす）
  if (authUser.email) {
    sendBankAccountCreatedEmail(
      authUser.email,
      dbUser.name || 'お客様',
      { bankName, branchName, accountHolderName: normalizedAccountHolderName }
    );
  }

  return NextResponse.json(
    {
      ...bankAccount,
      accountNumber: undefined,
      accountNumberMasked: `***${accountNumber.slice(-4)}`,
    },
    { status: 201 }
  );
});
