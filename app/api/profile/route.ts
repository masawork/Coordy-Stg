/**
 * プロフィールAPI - 作成
 * POST /api/profile
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, validationError, notFoundError, forbiddenError, conflictError } from '@/lib/api/errors';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { userId, fullName, displayName, address, phoneNumber, dateOfBirth, gender, isProfileComplete } = body;

  // 必須項目チェック
  if (!userId) {
    return validationError('ユーザーIDが必要です');
  }

  // Supabase からユーザー情報を取得
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 認証ユーザーのメールアドレスでPrismaユーザーを検証
  // クライアントから渡されたuserIdはPrisma User IDのはず
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // セキュリティチェック：認証ユーザーのメールと一致するか確認
  if (dbUser && user && dbUser.email !== user.email) {
    return forbiddenError('権限がありません');
  }

  // users テーブルにユーザーが存在しない場合はエラー
  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // プロフィール作成
  const profile = await prisma.clientProfile.create({
    data: {
      userId,
      fullName: fullName || null,
      displayName: displayName || null,
      address: address || null,
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      isProfileComplete: isProfileComplete ?? false,
    },
  });

  return NextResponse.json(profile, { status: 201 });
});
