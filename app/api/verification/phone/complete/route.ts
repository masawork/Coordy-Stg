import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 電話番号確認完了API
 * Supabase Auth でOTP検証が成功した後、ClientProfileを更新
 */
export async function POST(request: NextRequest) {
  try {
    // Supabase Authセッション確認
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('📞 Phone verification complete for user:', userId);

    // まず users テーブルにユーザーが存在するか確認
    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // users テーブルにユーザーが存在しない場合は作成
    if (!dbUser) {
      console.log('✨ Creating new user in database');
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
      // プロフィールが存在しない場合は作成
      console.log('✨ Creating new profile with phoneVerified: true');
      profile = await prisma.clientProfile.create({
        data: {
          userId,
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          verificationLevel: 1, // Level 1: 基本認証
        },
      });
    } else {
      // プロフィールが存在する場合は更新
      console.log('🔄 Updating existing profile - setting phoneVerified: true');
      profile = await prisma.clientProfile.update({
        where: { userId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          verificationLevel: Math.max(profile.verificationLevel, 1), // 最低でもLevel 1
        },
      });
    }

    console.log('✅ Phone verification complete - phoneVerified:', profile.phoneVerified, 'level:', profile.verificationLevel);

    return NextResponse.json({
      success: true,
      phoneVerified: profile.phoneVerified,
      verificationLevel: profile.verificationLevel,
      message: '電話番号の確認が完了しました',
    });
  } catch (error: any) {
    console.error('Phone verification complete error:', error);
    return NextResponse.json(
      { error: '電話番号確認の完了処理に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

