/**
 * セッション管理（クライアント側）
 * localStorageを使用してセッション情報を永続化
 */

import type { User, Role } from './types';

const SESSION_KEY = 'coordy_session';
const USER_KEY = 'coordy_user';

/**
 * セッション情報を保存
 */
export function saveSession(user: User): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, 'true');
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * セッション情報を取得
 */
export function getSession(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * セッションをクリア
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * セッションの存在をチェック
 */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(SESSION_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * ユーザーのロールを取得
 */
export function getUserRole(): Role | null {
  const user = getSession();
  return user?.role || null;
}

/**
 * 特定のロールかチェック
 */
export function hasRole(role: Role): boolean {
  const userRole = getUserRole();
  return userRole === role;
}

/**
 * いずれかのロールかチェック
 */
export function hasAnyRole(roles: Role[]): boolean {
  const userRole = getUserRole();
  return userRole ? roles.includes(userRole) : false;
}
