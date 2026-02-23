/**
 * プロフィールAPI - 取得・更新
 * GET /api/profile/[userId] - プロフィール取得
 * PUT /api/profile/[userId] - プロフィール更新
 *
 * userIdはPrisma UserのID（Supabase Auth IDではない）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, validationError, unauthorizedError, notFoundError, forbiddenError } from '@/lib/api/errors';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const { userId } = await params;

  if (!userId) {
    return validationError('ユーザーIDが必要です');
  }

  // Supabase認証を確認
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma UserをIDで検索
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // メールアドレスが一致するか確認（セキュリティチェック）
  if (dbUser.email !== authUser.email) {
    return forbiddenError('権限がありません');
  }

  let profile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  // プロフィールが無ければデフォルトで作成
  if (!profile) {
    profile = await prisma.clientProfile.create({
      data: {
        userId,
        fullName: authUser.user_metadata?.full_name || null,
        displayName: authUser.user_metadata?.name || authUser.email || null,
        address: null,
        phoneNumber: authUser.phone || null,
        isProfileComplete: false,
        verificationLevel: 0,
        phoneVerified: false,
        identityVerified: false,
      },
    });
  }

  return NextResponse.json(profile);
});

export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) => {
  const { userId } = await params;
  const body = await request.json();

  if (!userId) {
    return validationError('ユーザーIDが必要です');
  }

  // Supabase認証を確認
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma UserをIDで検索
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  // メールアドレスが一致するか確認（セキュリティチェック）
  if (dbUser.email !== authUser.email) {
    return forbiddenError('権限がありません');
  }

  // 更新データの準備
  const updateData: any = {};

  if (body.fullName !== undefined) {
    updateData.fullName = body.fullName || null;
  }
  if (body.displayName !== undefined) {
    updateData.displayName = body.displayName || null;
  }
  if (body.address !== undefined) {
    updateData.address = body.address || null;
  }
  if (body.phoneNumber !== undefined) {
    updateData.phoneNumber = body.phoneNumber || null;
  }
  if (body.dateOfBirth !== undefined) {
    updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
  }
  if (body.gender !== undefined) {
    updateData.gender = body.gender || null;
  }
  if (body.isProfileComplete !== undefined) {
    updateData.isProfileComplete = body.isProfileComplete;
  }

  // プロフィールをupsert（存在しなければ作成）
  const profile = await prisma.clientProfile.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      ...updateData,
      isProfileComplete: updateData.isProfileComplete ?? false,
      verificationLevel: 0,
      phoneVerified: false,
      identityVerified: false,
    },
  });

  return NextResponse.json(profile);
});
