/**
 * クライアントサイド認証関数（Supabase Auth）
 */

'use client';

import { createClient } from '@/lib/supabase/client';

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'instructor' | 'admin';
}

export interface SignInParams {
  email: string;
  password: string;
}

/**
 * サインアップ
 */
export async function signUp({ email, password, name, role }: SignUpParams) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * サインイン
 */
export async function signIn({ email, password }: SignInParams) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * サインアウト
 */
export async function signOut() {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * セッション取得
 */
export async function getSession() {
  const supabase = createClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Get session error:', error);
    return null;
  }

  return session;
}

/**
 * パスワードリセット
 */
export async function resetPassword(email: string) {
  const supabase = createClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Google認証
 * 常にアカウント選択画面を表示
 */
export async function signInWithGoogle(role: 'user' | 'instructor' = 'user') {
  const supabase = createClient();

  // 既存のセッションをクリアしてから新しいログインを開始
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      queryParams: {
        prompt: 'select_account', // 常にアカウント選択画面を表示
        access_type: 'offline', // リフレッシュトークンを取得
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * パスワード忘れ（エイリアス）
 */
export const forgotPassword = resetPassword;

/**
 * セッションクリア（サインアウトのエイリアス）
 */
export const clearSession = signOut;

/**
 * 現在のユーザー取得
 */
export async function getCurrentAuthUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }
  return session.user;
}
