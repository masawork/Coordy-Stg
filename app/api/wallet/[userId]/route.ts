/**
 * ウォレットAPI - 残高取得
 * GET /api/wallet/[userId]
 *
 * Note: userId パラメータは Supabase Auth ID を期待
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: authId } = await params; // これはSupabase Auth ID

    if (!authId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // Supabase からユーザー情報を取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('💰 Wallet API - Requested authId:', authId);
    console.log('💰 Wallet API - Supabase user:', user?.id);

    // 認証されていない場合は401で返す
    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストされた authId と認証済みユーザーが一致するか検証
    if (authId !== user.id) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // authId でユーザーを検索
    let dbUser = await prisma.user.findFirst({
      where: { authId },
    });

    console.log('💰 Wallet API - DB user exists:', !!dbUser);

    // ユーザーが存在しない場合は作成
    if (!dbUser) {
      console.log('✨ Creating user in database with authId:', authId);
      const role = ((user.user_metadata?.role as string | undefined)?.toUpperCase() || 'USER') as UserRole;
      dbUser = await prisma.user.create({
        data: {
          authId,
          name: user.user_metadata?.full_name || user.email || '',
          email: user.email || '',
          role,
        },
      });
      console.log('✅ User created successfully:', dbUser.id);
    }

    // ウォレット取得または作成（Prisma User ID を使用）
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
    return NextResponse.json(
      { error: 'ウォレットの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

