/**
 * Google OAuth コールバックAPI
 * GET /api/google/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTokensFromCode } from '@/lib/google/oauth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL('/instructor/settings?error=google_auth_denied', request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/instructor/settings?error=missing_params', request.url)
      );
    }

    // stateをデコード
    let stateData: { instructorId: string; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        new URL('/instructor/settings?error=invalid_state', request.url)
      );
    }

    // トークンを取得
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/instructor/settings?error=no_tokens', request.url)
      );
    }

    // インストラクターのGoogle認証情報を保存
    await prisma.instructor.update({
      where: { id: stateData.instructorId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    // 成功時はreturnUrlにリダイレクト
    const returnUrl = stateData.returnUrl || '/instructor/settings';
    return NextResponse.redirect(
      new URL(`${returnUrl}?success=google_connected`, request.url)
    );
  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      new URL('/instructor/settings?error=callback_failed', request.url)
    );
  }
}
