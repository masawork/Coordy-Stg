/**
 * 管理者用ロール変更API
 * POST /api/admin/users/set-role
 *
 * 他ユーザーのロールを変更する（Auth側とDB側の両方を更新）
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { getAuthAdmin } from '@/lib/api/auth';
import { updateUserRole as updateAuthUserRole } from '@/lib/supabase/admin';
import { withErrorHandler, validationError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

// 有効なロール値
const VALID_ROLES = ['user', 'instructor', 'admin'] as const;
type ValidRole = typeof VALID_ROLES[number];

export const POST = withErrorHandler(async (request: NextRequest) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const { dbUser: adminUser } = authResult;

  // リクエストボディの取得
  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return validationError('userId と role は必須です');
  }

  // ロールのバリデーション
  const normalizedRole = role.toLowerCase() as ValidRole;
  if (!VALID_ROLES.includes(normalizedRole)) {
    return validationError(`無効なロールです。有効な値: ${VALID_ROLES.join(', ')}`);
  }

  // 対象ユーザーの存在チェック
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { instructor: true },
  });

  if (!targetUser) {
    return notFoundError('指定されたユーザー');
  }

  // 自分自身のロールは変更不可（安全対策）
  if (userId === adminUser.id) {
    return validationError('自分自身のロールは変更できません');
  }

  const prismaRole = normalizedRole.toUpperCase() as UserRole;
  const oldRole = targetUser.role;

  // Supabase Auth側のuser_metadataを更新
  try {
    await updateAuthUserRole(userId, normalizedRole);
    console.log(`Auth user_metadata updated: ${userId} -> ${normalizedRole}`);
  } catch (authUpdateError: any) {
    console.error('Failed to update Auth user_metadata:', authUpdateError);
    // Auth側の更新に失敗しても、DB側は更新を試みる
    // （ローカル開発でSERVICE_ROLE_KEYがない場合など）
  }

  // Prisma DB側のロールを更新
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: prismaRole },
  });

  // インストラクターへの昇格時、Instructorレコードを作成
  if (normalizedRole === 'instructor' && !targetUser.instructor) {
    await prisma.instructor.create({
      data: { userId },
    });
    console.log(`Instructor record created for user: ${userId}`);
  }

  // 成功レスポンス
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
});
