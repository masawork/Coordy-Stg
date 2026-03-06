/**
 * ロール別ユーザー検証API
 * 現在のセッションユーザーが指定されたロールで登録されているかを確認
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const role = request.nextUrl.searchParams.get('role') || 'user';
  const prismaRole = role.toUpperCase() as UserRole;

  // Supabase セッションからユーザー情報を取得
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // メールアドレス + ロール でユーザーを検索
  const dbUser = await prisma.user.findUnique({
    where: {
      email_role: {
        email: authUser.email!,
        role: prismaRole,
      },
    },
    include: {
      clientProfile: true,
      instructor: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!dbUser) {
    return notFoundError('このロールでのユーザー');
  }

  return NextResponse.json({
    user: dbUser,
    profile: dbUser.clientProfile,
  });
});
