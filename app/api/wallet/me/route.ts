/**
 * ウォレットAPI - 現在のユーザーの残高取得
 * GET /api/wallet/me?role=user|instructor
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

    // Supabase からユーザー情報を取得
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

    // ウォレット取得または作成
    let wallet = await prisma.wallet.findUnique({
      where: { userId: dbUser.id },
    });

    // ウォレットが存在しない場合は作成
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: dbUser.id,
          balance: 0,
        },
      });
    }

    return NextResponse.json(wallet);
  } catch (error: any) {
    console.error('Get wallet error:', error);
    
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
      { error: 'ウォレットの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
