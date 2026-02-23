import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/api/auth';
import { encrypt } from '@/lib/utils/encryption';
import { sendBankAccountUpdatedEmail, sendBankAccountDeletedEmail } from '@/lib/mail/resend';
import { withErrorHandler, notFoundError, forbiddenError, validationError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

const toHalfWidthDigits = (value: string) =>
  (value || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '');

/**
 * 銀行口座更新
 */
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser, authUser } = authResult;

  const { id } = await params;

  // 銀行口座を取得
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!bankAccount) {
    return notFoundError('銀行口座');
  }

  if (bankAccount.userId !== dbUser.id) {
    return forbiddenError('この銀行口座を編集する権限がありません');
  }

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

  // 銀行口座を更新
  const updatedBankAccount = await prisma.bankAccount.update({
    where: { id },
    data: {
      accountType,
      bankName,
      bankCode: normalizedBankCode,
      branchName,
      branchCode: normalizedBranchCode,
      accountNumber: encryptedAccountNumber,
      accountHolderName: normalizedAccountHolderName,
    },
  });

  // メール通知を送信（非同期で実行、エラーは握りつぶす）
  if (authUser.email) {
    sendBankAccountUpdatedEmail(
      authUser.email,
      dbUser.name || 'お客様',
      { bankName, branchName, accountHolderName: normalizedAccountHolderName }
    );
  }

  return NextResponse.json({
    ...updatedBankAccount,
    accountNumber: undefined,
    accountNumberMasked: `***${accountNumber.slice(-4)}`,
  });
});

/**
 * 銀行口座削除
 */
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthUser();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser, authUser } = authResult;

  const { id } = await params;

  // 銀行口座を取得
  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id },
  });

  if (!bankAccount) {
    return notFoundError('銀行口座');
  }

  if (bankAccount.userId !== dbUser.id) {
    return forbiddenError('この銀行口座を削除する権限がありません');
  }

  // 削除前に口座情報を保持（メール用）
  const deletedAccountInfo = {
    bankName: bankAccount.bankName,
    branchName: bankAccount.branchName,
    accountHolderName: bankAccount.accountHolderName,
  };

  // 削除
  await prisma.bankAccount.delete({
    where: { id },
  });

  // メール通知を送信（非同期で実行、エラーは握りつぶす）
  if (authUser.email) {
    sendBankAccountDeletedEmail(
      authUser.email,
      dbUser.name || 'お客様',
      deletedAccountInfo
    );
  }

  return NextResponse.json({ success: true });
});
