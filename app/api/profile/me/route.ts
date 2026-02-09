import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 現在のユーザーのプロフィール取得
 * GET /api/profile/me?role=user|instructor
 */
export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get('role') || 'user';
    const prismaRole = role.toUpperCase() as UserRole;

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // email + role でユーザーを検索
    const dbUser = await prisma.user.findUnique({
      where: {
        email_role: {
          email: authUser.email!,
          role: prismaRole,
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    let profile = await prisma.clientProfile.findUnique({
      where: { userId: dbUser.id },
    });

    // プロフィールが無ければデフォルトで作成（isProfileComplete: false）
    if (!profile) {
      profile = await prisma.clientProfile.create({
        data: {
          userId: dbUser.id,
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

    console.log('📋 GET profile/me for', dbUser.id, '- role:', role);

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('Get current user profile error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

