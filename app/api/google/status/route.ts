/**
 * Google連携状態確認・解除API
 * GET /api/google/status - 連携状態を確認
 * DELETE /api/google/status - 連携を解除
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
      include: {
        instructor: {
          select: {
            googleAccessToken: true,
            googleRefreshToken: true,
          },
        },
      },
    });

    if (!dbUser?.instructor) {
      return NextResponse.json({ connected: false });
    }

    const connected = !!(
      dbUser.instructor.googleAccessToken && dbUser.instructor.googleRefreshToken
    );

    return NextResponse.json({ connected });
  } catch (error: any) {
    console.error('Google status error:', error);
    return NextResponse.json(
      { error: 'ステータス確認に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
      include: { instructor: true },
    });

    if (!dbUser?.instructor) {
      return NextResponse.json(
        { error: 'インストラクターが見つかりません' },
        { status: 404 }
      );
    }

    // Google連携を解除
    await prisma.instructor.update({
      where: { id: dbUser.instructor.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Google連携を解除しました' });
  } catch (error: any) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: '連携解除に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
