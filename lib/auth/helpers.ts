/**
 * 認証ヘルパー関数（Supabase Auth）
 * クライアントサイド・サーバーサイドの両方で使用可能
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

// 型定義
export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'instructor' | 'admin';
}

export interface SignInParams {
  email: string;
  password: string;
}

// Supabase Auth型のエクスポート
export type User = SupabaseUser;
export type Session = SupabaseSession;

/**
 * クライアントサイド認証関数
 */

// サインアップ
export async function signUp(params: SignUpParams) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        role: params.role || 'user',
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;

  // Supabase Auth登録成功後、Prisma usersテーブルにも同期
  if (data.user) {
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: data.user.email,
          name: params.name,
          role: params.role || 'user',
        }),
      });
      console.log('✅ Prisma usersテーブルに同期完了');
    } catch (syncError) {
      console.error('⚠️ Prisma同期エラー（登録は成功）:', syncError);
      // 同期エラーでも登録は成功しているので続行
    }
  }

  return data;
}

// サインイン
export async function signIn(params: SignInParams) {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) throw error;
  return data;
}

// サインアウト
export async function signOut() {
  const supabase = createBrowserClient();
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Google OAuth
export async function signInWithGoogle() {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// パスワードリセット
export async function resetPassword(email: string) {
  const supabase = createBrowserClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

// クライアントサイドでユーザー取得
export async function getUser() {
  const supabase = createBrowserClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  
  return user;
}

// クライアントサイドでセッション取得
export async function getSession() {
  const supabase = createBrowserClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  
  return session;
}

/**
 * サーバーサイド認証関数
 */

// サーバーサイドでユーザー取得
export async function getServerUser() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// サーバーサイドでセッション取得
export async function getServerSession() {
  const supabase = await createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ロールチェック（サーバーサイド）
export async function checkRole(allowedRoles: Array<'user' | 'instructor' | 'admin'>) {
  const user = await getServerUser();
  if (!user) return false;

  const userRole = user.user_metadata?.role?.toLowerCase();
  return allowedRoles.some(role => role.toLowerCase() === userRole);
}

// 特定のロールを要求（サーバーサイド）
export async function requireRole(role: 'user' | 'instructor' | 'admin') {
  const user = await getServerUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const userRole = user.user_metadata?.role?.toLowerCase();
  if (userRole !== role.toLowerCase()) {
    throw new Error('Forbidden');
  }

  return user;
}
