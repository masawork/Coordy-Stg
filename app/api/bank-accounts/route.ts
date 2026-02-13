import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/utils/encryption';
import { sendBankAccountCreatedEmail } from '@/lib/mail/resend';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

const toHalfWidthDigits = (value: string) =>
  (value || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '');

/**
 * 銀行口座一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Supabase Auth IDからPrisma User IDを取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーデータが見つかりません。再度ログインしてください。' },
        { status: 400 }
      );
    }

    const userId = dbUser.id;

    // 口座番号は暗号化されているため、マスク表示用に取得
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        accountType: true,
        bankName: true,
        bankCode: true,
        branchName: true,
        branchCode: true,
        accountNumber: true, // 暗号化済み（復号化はクライアント側で行わない）
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
  } catch (error: any) {
    console.error('Get bank accounts error:', error);
    return NextResponse.json(
      { error: '銀行口座情報の取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 銀行口座登録
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Supabase Auth IDからPrisma User IDを取得
    const dbUser = await prisma.user.findFirst({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーデータが見つかりません。再度ログインしてください。' },
        { status: 400 }
      );
    }

    const userId = dbUser.id;
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
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    if (normalizedBankCode.length !== 4) {
      return NextResponse.json(
        { error: '銀行コードは4桁の数字で入力してください' },
        { status: 400 }
      );
    }

    if (normalizedBranchCode.length !== 3) {
      return NextResponse.json(
        { error: '支店コードは3桁の数字で入力してください' },
        { status: 400 }
      );
    }

    if (normalizedAccountNumber.length !== 7) {
      return NextResponse.json(
        { error: '口座番号は7桁の数字で入力してください' },
        { status: 400 }
      );
    }

    const katakanaRegex = /^[ァ-ヴーｦ-ﾟー・\s　]+$/;
    if (!katakanaRegex.test(normalizedAccountHolderName)) {
      return NextResponse.json(
        { error: '口座名義人は全角カタカナで入力してください' },
        { status: 400 }
      );
    }

    // 口座番号を暗号化
    const encryptedAccountNumber = encrypt(normalizedAccountNumber);

    // 既存の口座数を確認
    const existingAccounts = await prisma.bankAccount.findMany({
      where: { userId },
    });

    const isFirstAccount = existingAccounts.length === 0;

    // 銀行口座を登録
    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId,
        accountType,
        bankName,
        bankCode: normalizedBankCode,
        branchName,
        branchCode: normalizedBranchCode,
        accountNumber: encryptedAccountNumber,
        accountHolderName: normalizedAccountHolderName,
        // 今回の要件: 承認不要とするため即時承認扱い
        isVerified: true,
        isDefault: isFirstAccount, // 最初の口座はデフォルトに
      },
    });

    // メール通知を送信（非同期で実行、エラーは握りつぶす）
    if (user.email) {
      sendBankAccountCreatedEmail(
        user.email,
        dbUser.name || 'お客様',
        { bankName, branchName, accountHolderName: normalizedAccountHolderName }
      );
    }

    return NextResponse.json(
      {
        ...bankAccount,
        accountNumber: undefined, // 口座番号は返さない
        accountNumberMasked: `***${accountNumber.slice(-4)}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create bank account error:', error);
    const message =
      error?.message === 'ENCRYPTION_KEY environment variable is not set'
        ? 'サーバー設定に問題があります。管理者にお問い合わせください。'
        : '銀行口座の登録に失敗しました';
    return NextResponse.json(
      { error: message, details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
