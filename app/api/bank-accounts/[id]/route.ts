import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/utils/encryption';
import { sendBankAccountUpdatedEmail, sendBankAccountDeletedEmail } from '@/lib/mail/resend';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

const toHalfWidthDigits = (value: string) =>
  (value || '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[^0-9]/g, '');

/**
 * 銀行口座更新
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

    // 銀行口座を取得
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: '銀行口座が見つかりません' },
        { status: 404 }
      );
    }

    if (bankAccount.userId !== userId) {
      return NextResponse.json(
        { error: 'この銀行口座を編集する権限がありません' },
        { status: 403 }
      );
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
    if (user.email) {
      sendBankAccountUpdatedEmail(
        user.email,
        dbUser.name || 'お客様',
        { bankName, branchName, accountHolderName: normalizedAccountHolderName }
      );
    }

    return NextResponse.json({
      ...updatedBankAccount,
      accountNumber: undefined,
      accountNumberMasked: `***${accountNumber.slice(-4)}`,
    });
  } catch (error: any) {
    console.error('Update bank account error:', error);
    const message =
      error?.message === 'ENCRYPTION_KEY environment variable is not set'
        ? 'サーバー設定に問題があります。管理者にお問い合わせください。'
        : '銀行口座の更新に失敗しました';
    return NextResponse.json(
      { error: message, details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 銀行口座削除
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

    // 銀行口座を取得
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: '銀行口座が見つかりません' },
        { status: 404 }
      );
    }

    if (bankAccount.userId !== userId) {
      return NextResponse.json(
        { error: 'この銀行口座を削除する権限がありません' },
        { status: 403 }
      );
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
    if (user.email) {
      sendBankAccountDeletedEmail(
        user.email,
        dbUser.name || 'お客様',
        deletedAccountInfo
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete bank account error:', error);
    return NextResponse.json(
      { error: '銀行口座の削除に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

