/**
 * 認証ヘルパー関数
 * Issue #8: APIエラーレスポンス形式の統一
 *
 * 共通の認証パターンを再利用可能なヘルパーに抽出
 */

import { NextResponse } from 'next/server';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User, Instructor, UserRole } from '@prisma/client';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { unauthorizedError, forbiddenError, notFoundError } from './errors';

/**
 * 認証済みユーザーを取得
 * SupabaseとPrismaの両方からユーザー情報を取得する
 *
 * @param role - 取得するロールを明示指定。指定がない場合は user_metadata.role → フォールバック
 * @returns ユーザー情報 or エラーレスポンス
 */
export async function getAuthUser(role?: UserRole): Promise<
  { dbUser: User; authUser: SupabaseUser } | NextResponse
> {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  let dbUser: User | null = null;

  if (role) {
    dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id, role },
    });
  } else {
    const metadataRole = authUser.user_metadata?.role as string | undefined;
    if (metadataRole) {
      const prismaRole = metadataRole.toUpperCase() as UserRole;
      dbUser = await prisma.user.findFirst({
        where: { authId: authUser.id, role: prismaRole },
      });
    }
  }

  if (!dbUser) {
    dbUser = await prisma.user.findFirst({
      where: { authId: authUser.id },
    });
  }

  if (!dbUser) {
    return notFoundError('ユーザー');
  }

  return { dbUser, authUser };
}

/**
 * 認証済みインストラクターを取得
 * ユーザーがINSTRUCTORロールであり、instructor情報が存在することを確認
 *
 * @returns インストラクター情報 or エラーレスポンス
 */
export async function getAuthInstructor(): Promise<
  { instructor: Instructor; dbUser: User } | NextResponse
> {
  const authResult = await getAuthUser(UserRole.INSTRUCTOR);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  if (dbUser.role !== UserRole.INSTRUCTOR) {
    return forbiddenError('サービス提供者のみ利用可能です');
  }

  // インストラクター情報を取得
  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  if (!instructor) {
    return notFoundError('サービス提供者情報');
  }

  return { instructor, dbUser };
}

/**
 * 認証済み管理者を取得
 * ユーザーがADMINロールであることを確認
 *
 * @returns 管理者ユーザー情報 or エラーレスポンス
 */
export async function getAuthAdmin(): Promise<{ dbUser: User } | NextResponse> {
  const authResult = await getAuthUser(UserRole.ADMIN);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  if (dbUser.role !== UserRole.ADMIN) {
    return forbiddenError('管理者のみ利用可能です');
  }

  return { dbUser };
}

/**
 * 認証済み＆本人確認済みインストラクターを取得
 * サービスや商品の作成など、本人確認（Level 2）が必要な操作で使用
 *
 * @returns インストラクター情報 or エラーレスポンス
 */
export async function getVerifiedInstructor(): Promise<
  { instructor: Instructor; dbUser: User } | NextResponse
> {
  const authResult = await getAuthInstructor();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor, dbUser } = authResult;

  // 本人確認レベルチェック
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: dbUser.id },
  });

  if (!clientProfile || clientProfile.verificationLevel < 2) {
    return forbiddenError(
      '本人確認（Level 2）が必要です。本人確認書類を提出し、管理者の承認を受けてください。'
    );
  }

  return { instructor, dbUser };
}

/**
 * 出品者モードのユーザーを取得
 * sellerEnabled=true であることを確認し、Instructor情報も取得する
 */
export async function getAuthSeller(): Promise<
  { instructor: Instructor; dbUser: User } | NextResponse
> {
  const authResult = await getAuthUser(UserRole.INSTRUCTOR);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  // 出品者モードチェック
  if (!dbUser.sellerEnabled) {
    return forbiddenError('出品者モードが有効になっていません。モード切替を行ってください。');
  }

  // インストラクター情報を取得
  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  if (!instructor) {
    return notFoundError('出品者プロフィール');
  }

  return { instructor, dbUser };
}

/**
 * 本人確認済み出品者を取得
 * 出品公開など、本人確認（Level 2）が必要な操作で使用
 */
export async function getVerifiedSeller(): Promise<
  { instructor: Instructor; dbUser: User } | NextResponse
> {
  const authResult = await getAuthSeller();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { instructor, dbUser } = authResult;

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: dbUser.id },
  });

  if (!clientProfile || clientProfile.verificationLevel < 2) {
    return forbiddenError(
      '本人確認（Level 2）が必要です。本人確認書類を提出し、管理者の承認を受けてください。'
    );
  }

  return { instructor, dbUser };
}

/**
 * 型ガード: NextResponseかどうかを判定
 */
export function isErrorResponse(
  result: unknown
): result is NextResponse {
  return result instanceof NextResponse;
}
