/**
 * プロフィールAPI - 取得・更新
 * GET /api/profile/[userId] - プロフィール取得
 * PUT /api/profile/[userId] - プロフィール更新
 *
 * userIdはPrisma UserのID（Supabase Auth IDではない）
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase認証を確認
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Prisma UserをIDで検索
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // メールアドレスが一致するか確認（セキュリティチェック）
    if (dbUser.email !== authUser.email) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
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
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase認証を確認
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // Prisma UserをIDで検索
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // メールアドレスが一致するか確認（セキュリティチェック）
    if (dbUser.email !== authUser.email) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
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
  } catch (error: any) {
    console.error('Update profile error:', error);

    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
