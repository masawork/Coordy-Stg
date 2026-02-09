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
 * @returns ユーザー情報 or エラーレスポンス
 */
export async function getAuthUser(): Promise<
  { dbUser: User; authUser: SupabaseUser } | NextResponse
> {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return unauthorizedError();
  }

  // Prisma Userを取得
  const dbUser = await prisma.user.findFirst({
    where: { authId: authUser.id },
  });

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
  const authResult = await getAuthUser();

  // エラーレスポンスの場合はそのまま返す
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  // ロールチェック
  if (dbUser.role !== UserRole.INSTRUCTOR) {
    return forbiddenError('インストラクターのみ利用可能です');
  }

  // インストラクター情報を取得
  const instructor = await prisma.instructor.findUnique({
    where: { userId: dbUser.id },
  });

  if (!instructor) {
    return notFoundError('インストラクター情報');
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
  const authResult = await getAuthUser();

  // エラーレスポンスの場合はそのまま返す
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { dbUser } = authResult;

  // 管理者ロールチェック
  if (dbUser.role !== UserRole.ADMIN) {
    return forbiddenError('管理者のみ利用可能です');
  }

  return { dbUser };
}

/**
 * 型ガード: NextResponseかどうかを判定
 */
export function isErrorResponse(
  result: any
): result is NextResponse {
  return result instanceof NextResponse;
}
