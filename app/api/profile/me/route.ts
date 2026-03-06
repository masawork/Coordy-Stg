import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 現在のユーザーのプロフィール取得
 * GET /api/profile/me?role=user|instructor
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const role = request.nextUrl.searchParams.get('role') || 'user';
  const prismaRole = role.toUpperCase() as UserRole;

  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
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
    return notFoundError('ユーザー');
  }

  let profile = await prisma.clientProfile.findUnique({
    where: { userId: dbUser.id },
  });

  // プロフィールが無ければデフォルトで作成（isProfileComplete: false）
  if (!profile) {
    profile = await prisma.clientProfile.create({
      data: {
        userId: dbUser.id,
        fullName: authUser.user_metadata?.full_name || null,
        displayName: authUser.user_metadata?.name || authUser.email || null,
        address: null,
        phoneNumber: authUser.phone || null,
        isProfileComplete: false,
        verificationLevel: 0,
        phoneVerified: false,
        identityVerified: false,
      },
    });
  }

  return NextResponse.json(profile);
});
