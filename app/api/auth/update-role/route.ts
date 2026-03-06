import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, validationError } from '@/lib/api/errors';

/**
 * ユーザーのロールを更新するAPI（Supabase Auth）
 * サインアップ時にロールを設定するために使用
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();

  // セッションを取得
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return unauthorizedError();
  }

  const { role } = await request.json();

  if (!role || !['user', 'instructor', 'admin'].includes(role)) {
    return validationError('Invalid role');
  }

  const prismaRole = role.toUpperCase() as UserRole;

  // Supabase Authのuser_metadataを更新
  await supabase.auth.updateUser({
    data: { role }
  });

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { authId: session.user.id },
        { id: session.user.id },
      ],
    },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: prismaRole,
        authId: existingUser.authId || session.user.id,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        authId: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.email || '',
        role: prismaRole,
      },
    });
  }

  return NextResponse.json({ success: true });
});
