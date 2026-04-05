/**
 * ユーザー同期API
 * Supabase Authのユーザーを Prismaのusersテーブルに同期
 * POST /api/users/sync
 *
 * 認証済みユーザーのみ自分自身の同期を許可
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, validationError, unauthorizedError } from '@/lib/api/errors';

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 認証チェック: Supabaseで認証済みのユーザーのみ
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const body = await request.json();
  const { role } = body;

  // 自分自身のデータのみ同期可能（リクエストボディのIDは無視してauthUserから取得）
  const userId = authUser.id;
  const email = authUser.email;

  if (!email) {
    return validationError('メールアドレスが取得できませんでした');
  }

  // ロールのバリデーション: ADMINは直接作成不可
  const requestedRole = (role?.toUpperCase() as UserRole) || UserRole.USER;
  if (requestedRole === UserRole.ADMIN) {
    return validationError('管理者アカウントは直接作成できません');
  }

  // 既にユーザーが存在するかチェック（authId + role で検索）
  const existingUser = await prisma.user.findFirst({
    where: { authId: userId, role: requestedRole },
  });

  if (existingUser) {
    return NextResponse.json({ user: existingUser, created: false });
  }

  // Prismaにユーザーレコードを作成
  const user = await prisma.user.create({
    data: {
      authId: userId,
      email,
      name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || email.split('@')[0],
      role: requestedRole,
    },
  });

  return NextResponse.json({ user, created: true }, { status: 201 });
});
