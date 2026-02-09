/**
 * 管理者用ロール変更API
 * POST /api/admin/users/set-role
 *
 * 他ユーザーのロールを変更する（Auth側とDB側の両方を更新）
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { updateUserRole as updateAuthUserRole } from '@/lib/supabase/admin';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// 有効なロール値
const VALID_ROLES = ['user', 'instructor', 'admin'] as const;
type ValidRole = typeof VALID_ROLES[number];

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 2. 管理者権限チェック（email + role で検索）
    const adminUser = await prisma.user.findFirst({
      where: {
        email: authUser.email!,
        role: 'ADMIN',
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // 3. リクエストボディの取得
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId と role は必須です' },
        { status: 400 }
      );
    }

    // 4. ロールのバリデーション
    const normalizedRole = role.toLowerCase() as ValidRole;
    if (!VALID_ROLES.includes(normalizedRole)) {
      return NextResponse.json(
        { error: `無効なロールです。有効な値: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. 対象ユーザーの存在チェック
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { instructor: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: '指定されたユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 6. 自分自身のロールは変更不可（安全対策）
    if (userId === adminUser.id) {
      return NextResponse.json(
        { error: '自分自身のロールは変更できません' },
        { status: 400 }
      );
    }

    const prismaRole = normalizedRole.toUpperCase() as UserRole;
    const oldRole = targetUser.role;

    // 7. Supabase Auth側のuser_metadataを更新
    try {
      await updateAuthUserRole(userId, normalizedRole);
      console.log(`Auth user_metadata updated: ${userId} -> ${normalizedRole}`);
    } catch (authUpdateError: any) {
      console.error('Failed to update Auth user_metadata:', authUpdateError);
      // Auth側の更新に失敗しても、DB側は更新を試みる
      // （ローカル開発でSERVICE_ROLE_KEYがない場合など）
    }

    // 8. Prisma DB側のロールを更新
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: prismaRole },
    });

    // 9. インストラクターへの昇格時、Instructorレコードを作成
    if (normalizedRole === 'instructor' && !targetUser.instructor) {
      await prisma.instructor.create({
        data: { userId },
      });
      console.log(`Instructor record created for user: ${userId}`);
    }

    // 10. 成功レスポンス
    return NextResponse.json({
      success: true,
      message: `ロールを ${oldRole} から ${prismaRole} に変更しました`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Set role error:', error);
    return NextResponse.json(
      { error: 'ロールの変更に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
