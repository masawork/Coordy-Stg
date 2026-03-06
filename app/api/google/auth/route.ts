/**
 * Google OAuth認証開始API
 * GET /api/google/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google/oauth';
import { withErrorHandler, unauthorizedError, forbiddenError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // ユーザーがインストラクターか確認
  const dbUser = await prisma.user.findFirst({
    where: { authId: authUser.id },
    include: { instructor: true },
  });

  if (!dbUser?.instructor) {
    return forbiddenError('インストラクターのみがGoogle連携を利用できます');
  }

  // stateにインストラクターIDを含める
  const state = Buffer.from(JSON.stringify({
    instructorId: dbUser.instructor.id,
    returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/instructor/settings',
  })).toString('base64');

  const authUrl = getAuthUrl(state);

  return NextResponse.redirect(authUrl);
});
