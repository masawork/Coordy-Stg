import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, validationError, notFoundError } from '@/lib/api/errors';

/**
 * ユーザーのロールを切り替えるAPI
 *
 * 同一メールで複数ロール（email+roleユニーク制約）を持つ設計において、
 * ロール切り替え時に以下を行う：
 * 1. Supabase Auth の user_metadata.role を更新
 * 2. 切り替え先ロールの Prisma User レコードに authId を紐付け
 *
 * mode=signup の場合は従来のサインアップ時ロール設定動作を維持
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  const body = await request.json();
  const { role, mode } = body;

  if (!role || !['user', 'instructor', 'admin'].includes(role)) {
    return validationError('Invalid role');
  }

  const prismaRole = role.toUpperCase() as UserRole;

  // Supabase Authのuser_metadataを更新
  await supabase.auth.updateUser({
    data: { role },
  });

  if (mode === 'signup') {
    // サインアップモード: 新規レコード作成（従来の動作）
    const existingUser = await prisma.user.findUnique({
      where: {
        email_role: {
          email: authUser.email!,
          role: prismaRole,
        },
      },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { authId: authUser.id },
      });
    } else {
      await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.name || authUser.email || '',
          role: prismaRole,
        },
      });
    }
  } else {
    // ロール切り替えモード: 切り替え先のUserレコードが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: {
        email_role: {
          email: authUser.email!,
          role: prismaRole,
        },
      },
    });

    if (!targetUser) {
      return notFoundError('切り替え先のロール');
    }

    // 切り替え先の User レコードに authId を紐付け
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { authId: authUser.id },
    });
  }

  return NextResponse.json({ success: true, role });
});
