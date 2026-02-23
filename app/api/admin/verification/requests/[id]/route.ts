import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthAdmin } from '@/lib/api/auth';
import { withErrorHandler, notFoundError } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

/**
 * 本人確認申請の詳細を取得（管理者用）
 * GET /api/admin/verification/requests/[id]
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const authResult = await getAuthAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  // 申請詳細を取得
  const verificationRequest = await prisma.identityVerificationRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          clientProfile: {
            select: {
              fullName: true,
              phoneNumber: true,
              address: true,
              dateOfBirth: true,
              verificationLevel: true,
              phoneVerified: true,
              identityVerified: true,
            },
          },
        },
      },
      reviewer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!verificationRequest) {
    return notFoundError('申請');
  }

  return NextResponse.json(verificationRequest);
});
