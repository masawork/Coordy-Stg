/**
 * ユーザー同期API
 * Supabase Authのユーザーを Prismaのusersテーブルに同期
 * POST /api/users/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, name, role } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'ユーザーIDとメールアドレスが必要です' },
        { status: 400 }
      );
    }

    // 既にユーザーが存在するかチェック
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser, created: false });
    }

    // Prismaにユーザーレコードを作成
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name: name || email.split('@')[0],
        role: (role?.toUpperCase() as UserRole) || UserRole.USER,
      },
    });

    console.log(`✅ ユーザーを同期しました: ${user.email} (${user.role})`);

    return NextResponse.json({ user, created: true }, { status: 201 });
  } catch (error: any) {
    console.error('User sync error:', error);
    return NextResponse.json(
      { error: 'ユーザーの同期に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

