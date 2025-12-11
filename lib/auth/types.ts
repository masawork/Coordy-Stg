/**
 * 認証関連の型定義
 */

export type Role = 'user' | 'instructor' | 'admin';

export interface User {
  userId: string;
  email: string;
  name: string;
  displayName?: string;
  role: Role;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ConfirmSignUpParams {
  email: string;
  code: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  idToken: string;
  refreshToken?: string;
}

export interface AuthError {
  code: string;
  message: string;
}
