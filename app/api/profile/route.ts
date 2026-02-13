/**
 * プロフィールAPI - 作成
 * POST /api/profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fullName, displayName, address, phoneNumber, dateOfBirth, gender, isProfileComplete } = body;

    // 必須項目チェック
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase からユーザー情報を取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('📝 Profile API - Requested userId:', userId);
    console.log('📝 Profile API - Supabase user:', user?.id);

    // 認証ユーザーのメールアドレスでPrismaユーザーを検証
    // クライアントから渡されたuserIdはPrisma User IDのはず
    let dbUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    console.log('📝 Profile API - DB user exists:', !!dbUser);

    // セキュリティチェック：認証ユーザーのメールと一致するか確認
    if (dbUser && user && dbUser.email !== user.email) {
      console.error('❌ Email mismatch:', dbUser.email, '!==', user.email);
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // users テーブルにユーザーが存在しない場合はエラー
    // (通常はauth/callbackで作成されているはず)
    if (!dbUser) {
      console.error('❌ User not found with id:', userId);
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // プロフィール作成
    console.log('📝 Creating profile for user:', userId);
    const profile = await prisma.clientProfile.create({
      data: {
        userId,
        fullName: fullName || null,
        displayName: displayName || null,
        address: address || null,
        phoneNumber: phoneNumber || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        isProfileComplete: isProfileComplete ?? false,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error: any) {
    console.error('Create profile error:', error);
    
    // 重複エラーの場合
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'このユーザーのプロフィールは既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'プロフィールの作成に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

