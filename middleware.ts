/**
 * Next.js Middleware
 * ルート保護と認証チェックを実行
 */

import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静的ファイル、API、Next.js内部パスはスキップ
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // 画像、CSS等
  ) {
    return NextResponse.next();
  }

  // 公開ルート（認証不要）
  const publicPaths = [
    '/',
    '/login/user',
    '/login/instructor',
    '/signup/user',
    '/signup/instructor',
    '/verify',
  ];

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // セッションをチェック（localStorageはクライアント側のみなので、
  // ここではCookieまたはヘッダーでチェックする必要がある）
  // 現状はクライアント側での認証に依存しているため、
  // ここではパスパターンのみをチェック

  // 保護されたルートパターン
  // /user/*, /instructor/*, /admin/*

  if (pathname.startsWith('/user')) {
    // ユーザールートへのアクセス
    // TODO: 実際の認証チェック（Cookie等から）
    return NextResponse.next();
  }

  if (pathname.startsWith('/instructor')) {
    // インストラクタールートへのアクセス
    // TODO: 実際の認証チェック（Cookie等から）
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    // 管理者ルートへのアクセス
    // TODO: 実際の認証チェック（Cookie等から）
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
