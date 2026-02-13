import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * 本人確認ステータスを取得
 * GET /api/verification/identity/status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const userId = dbUser.id;

    // プロフィール取得（存在しない場合でも後続でフォールバックする）
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
    // null チェックを明示的に行う（|| 演算子は falsy 値（0, '', false）も除外するため）
    const profileData = {
      fullName: profile?.fullName ?? latestRequest?.fullName ?? null,
      dateOfBirth: profile?.dateOfBirth ?? latestRequest?.dateOfBirth ?? null,
      address: profile?.address ?? latestRequest?.address ?? null,
    };

    // デバッグログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('[identity-status] Profile data:', {
        profile: {
          fullName: profile?.fullName ?? null,
          dateOfBirth: profile?.dateOfBirth ?? null,
          address: profile?.address ?? null,
        },
        latestRequest: latestRequest
          ? {
              fullName: latestRequest.fullName,
              dateOfBirth: latestRequest.dateOfBirth,
              address: latestRequest.address,
            }
          : null,
        merged: profileData,
      });
    }

    return NextResponse.json({
      verificationLevel: profile?.verificationLevel ?? 0,
      identityVerified: profile?.identityVerified ?? false,
      identityVerifiedAt: profile?.identityVerifiedAt ?? null,
      identitySubmittedAt: profile?.identitySubmittedAt ?? null,
      identityRejectedReason: profile?.identityRejectedReason ?? null,
      // プロフィールデータ（フォーム自動入力用）- 以前の申請情報で補完
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
            // 以前の申請情報（フォールバック用）
            fullName: latestRequest.fullName,
            dateOfBirth: latestRequest.dateOfBirth,
            address: latestRequest.address,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Get identity verification status error:', error);
    return NextResponse.json(
      { error: 'ステータスの取得に失敗しました', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
