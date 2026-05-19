/**
 * GET /api/auth/available-roles
 * 現在ログイン中のユーザーが利用可能なロール一覧を返す
 * 同一メールで登録されている全ロールを検索する
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (_request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser || !authUser.email) {
    return unauthorizedError();
  }

  // 同一メールで登録されている全ロールのUserレコードを取得
  const users = await prisma.user.findMany({
    where: { email: authUser.email },
    select: {
      id: true,
      role: true,
      name: true,
      authId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // 現在のロール（user_metadataから）
  const currentRole = authUser.user_metadata?.role || null;

  const roles = users.map((u) => ({
    role: u.role.toLowerCase(),
    name: u.name,
    isCurrent: u.role.toLowerCase() === currentRole,
  }));

  return NextResponse.json({ roles, currentRole });
});
