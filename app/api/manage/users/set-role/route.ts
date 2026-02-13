import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

/**
 * POST /api/manage/users/set-role
 * body: { userId: string, role: 'USER' | 'INSTRUCTOR' | 'ADMIN' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, role } = body as { userId?: string; role?: UserRole };

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId と role は必須です' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error('Set role error:', error);
    return NextResponse.json({ error: 'ロール更新に失敗しました', details: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

