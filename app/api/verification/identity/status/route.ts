import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { withErrorHandler, unauthorizedError, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 本人確認ステータスを取得
 * GET /api/verification/identity/status
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorizedError();
  }

  const requestedRole = request.nextUrl.searchParams.get('role') || null;
  const prismaRole = requestedRole
    ? (requestedRole.toUpperCase() as 'USER' | 'INSTRUCTOR' | 'ADMIN')
    : null;

  const dbUser = prismaRole
    ? await prisma.user.findUnique({
        where: {
          email_role: {
            email: user.email!,
            role: prismaRole,
          },
        },
      })
    : await prisma.user.findFirst({
        where: {
          authId: user.id,
        },
      });

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  const userId = dbUser.id;

  // プロフィール取得
  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  // 最新の申請を取得
  const latestRequest = await prisma.identityVerificationRequest.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      reviewer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // プロフィールに情報がない場合は、以前の申請情報から補完
  const profileData = {
    fullName: profile?.fullName ?? latestRequest?.fullName ?? null,
    dateOfBirth: profile?.dateOfBirth ?? latestRequest?.dateOfBirth ?? null,
    address: profile?.address ?? latestRequest?.address ?? null,
  };

  return NextResponse.json({
    verificationLevel: profile?.verificationLevel ?? 0,
    identityVerified: profile?.identityVerified ?? false,
    identityVerifiedAt: profile?.identityVerifiedAt ?? null,
    identitySubmittedAt: profile?.identitySubmittedAt ?? null,
    identityRejectedReason: profile?.identityRejectedReason ?? null,
    profile: profileData,
    request: latestRequest
      ? {
          id: latestRequest.id,
          status: latestRequest.status,
          documentType: latestRequest.documentType,
          submittedAt: latestRequest.createdAt,
          reviewedAt: latestRequest.reviewedAt,
          reviewedBy: latestRequest.reviewer?.name,
          rejectedReason: latestRequest.rejectedReason,
          fullName: latestRequest.fullName,
          dateOfBirth: latestRequest.dateOfBirth,
          address: latestRequest.address,
        }
      : null,
  });
});
