/**
 * 認証モジュールのエントリポイント
 * Supabase Authベースの認証システム
 * クライアントサイド専用
 */

// クライアントサイド認証関数のみエクスポート
export {
  signIn,
  signUp,
  signOut,
  getSession,
  resetPassword,
  forgotPassword,
  signInWithGoogle,
  clearSession,
  getCurrentAuthUser,
} from './client';

// 型定義
export type { User, Session } from './helpers';
export type { SignUpParams, SignInParams } from './client';
