/**
 * ロール別ユーザー検証API
 * 現在のセッションユーザーが指定されたロールで登録されているかを確認
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const role = request.nextUrl.searchParams.get('role') || 'user';
    const prismaRole = role.toUpperCase() as UserRole;

    // Supabase セッションからユーザー情報を取得
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'このロールでユーザーが登録されていません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: dbUser,
      profile: dbUser.clientProfile,
    });
  } catch (error: any) {
    console.error('Check role error:', error);
    
    // データベーススキーマエラーの場合、より詳細なエラーメッセージを返す
    if (error.code === 'P2022' || error.message?.includes('does not exist')) {
      console.error('Database schema error - column may not exist:', error.message);
      return NextResponse.json(
        { 
          error: 'データベーススキーマエラー', 
          details: 'データベースのスキーマが最新ではありません。マイグレーションを実行してください。',
          code: error.code 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'ロールチェックに失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
