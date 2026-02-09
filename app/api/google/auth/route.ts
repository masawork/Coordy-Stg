/**
 * Google OAuth認証開始API
 * GET /api/google/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { getAuthUrl } from '@/lib/google/oauth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーがインストラクターか確認
    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
      include: { instructor: true },
    });

    if (!dbUser?.instructor) {
      return NextResponse.json(
        { error: 'インストラクターのみがGoogle連携を利用できます' },
        { status: 403 }
      );
    }

    // stateにインストラクターIDを含める
    const state = Buffer.from(JSON.stringify({
      instructorId: dbUser.instructor.id,
      returnUrl: request.nextUrl.searchParams.get('returnUrl') || '/instructor/settings',
    })).toString('base64');

    const authUrl = getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Google認証の開始に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
