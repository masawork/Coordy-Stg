import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 電話番号確認完了API
 * Supabase Auth でOTP検証が成功した後、ClientProfileを更新
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Supabase Authセッション確認
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const userId = user.id;

  // まず users テーブルにユーザーが存在するか確認
  let dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // users テーブルにユーザーが存在しない場合は作成
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        name: user.user_metadata?.full_name || user.email || '',
        email: user.email || '',
        role: user.user_metadata?.role?.toUpperCase() || 'USER',
      },
    });
  }

  // ClientProfileを取得または作成
  let profile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await prisma.clientProfile.create({
      data: {
        userId,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        verificationLevel: 1,
      },
    });
  } else {
    profile = await prisma.clientProfile.update({
      where: { userId },
      data: {
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        verificationLevel: Math.max(profile.verificationLevel, 1),
      },
    });
  }

  return NextResponse.json({
    success: true,
    phoneVerified: profile.phoneVerified,
    verificationLevel: profile.verificationLevel,
    message: '電話番号の確認が完了しました',
  });
});
