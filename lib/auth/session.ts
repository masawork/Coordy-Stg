/**
 * セッション管理（クライアント側）
 * 
 * ストレージ方式:
 * - user/instructor: localStorage（永続化、明示的ログアウトまで有効）
 * - admin: sessionStorage（ブラウザ閉じるとログアウト、セキュリティ向上）
 * 
 * dev起動時:
 * - セッションバージョンが変更されると全セッションがクリアされる
 */

import type { User, Role } from './types';

const SESSION_KEY = 'coordy_session'; // backward compat
const USER_KEY = 'coordy_user'; // backward compat (mixed)
const SESSION_VERSION_KEY = 'coordy_session_version';
const ADMIN_SESSION_KEY = 'coordy_admin_session';
const ADMIN_USER_KEY = 'coordy_admin_user';
const INSTRUCTOR_SESSION_KEY = 'coordy_instructor_session';
const INSTRUCTOR_USER_KEY = 'coordy_instructor_user';
const USER_SESSION_KEY = 'coordy_user_session';

/**
 * 全セッションをクリア（user, instructor, admin全て）
 * Amplify/Cognito のトークンも含めてクリア
 */
export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;

  try {
    // localStorage のセッション
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    
    // sessionStorage のadminセッション
    sessionStorage.removeItem(ADMIN_USER_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    
    // Amplify/Cognito のトークンもクリア
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('CognitoIdentityServiceProvider') ||
        key.startsWith('amplify') ||
        key.startsWith('aws.')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ 全セッションをクリアしました');
  } catch (error) {
    console.error('Failed to clear all sessions:', error);
  }
}

/**
 * セッションバージョンをチェックし、不一致なら全セッションをクリア
 * dev起動時に新しいバージョンが設定されるため、再ログインが必要になる
 */
export function checkSessionVersion(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    // グローバル変数から現在のセッションバージョンを取得
    const serverVersion = (window as any).__SESSION_VERSION__;
    if (!serverVersion) return true; // バージョン管理が無効の場合はスキップ

    const storedVersion = localStorage.getItem(SESSION_VERSION_KEY);
    
    if (storedVersion !== serverVersion) {
      console.log('🔄 セッションバージョン不一致 - 全セッションをクリアします');
      clearAllSessions();
      localStorage.setItem(SESSION_VERSION_KEY, serverVersion);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to check session version:', error);
    return true;
  }
}

/**
 * ロールに応じたストレージを取得
 * admin: sessionStorage（ブラウザ閉じるとクリア）
 * user/instructor: localStorage（永続化）
 */
function getStorage(role?: Role): Storage {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
  }
  
  // adminはsessionStorageを使用（セキュリティ向上）
  if (role === 'admin') {
    return sessionStorage;
  }
  return localStorage;
}

/**
 * セッション情報を保存
 * adminはsessionStorage、それ以外はlocalStorageに保存
 */
export function saveSession(user: User): void {
  if (typeof window === 'undefined') return;

  try {
    const storage = getStorage(user.role);
    const userKey =
      user.role === 'admin'
        ? ADMIN_USER_KEY
        : user.role === 'instructor'
        ? INSTRUCTOR_USER_KEY
        : USER_KEY;
    const sessionKey =
      user.role === 'admin'
        ? ADMIN_SESSION_KEY
        : user.role === 'instructor'
        ? INSTRUCTOR_SESSION_KEY
        : USER_SESSION_KEY;
    
    storage.setItem(userKey, JSON.stringify(user));
    storage.setItem(sessionKey, 'true');
    
    if (user.role === 'admin') {
      console.log('🔒 管理者セッションを保存（sessionStorage - ブラウザ閉じると無効）');
    }
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * セッション情報を取得
 * adminはsessionStorageから、それ以外はlocalStorageから取得
 */
export function getSession(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    // user -> instructor -> admin の順で取得（adminで上書きしない）
    const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem(USER_SESSION_KEY);
    if (userStr) return JSON.parse(userStr) as User;

    const instructorStr = localStorage.getItem(INSTRUCTOR_USER_KEY);
    if (instructorStr) return JSON.parse(instructorStr) as User;

    const adminUserStr = sessionStorage.getItem(ADMIN_USER_KEY);
    if (adminUserStr) return JSON.parse(adminUserStr) as User;

    return null;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * ロールを指定してセッションを取得（他ロールを無視）
 */
export function getSessionForRole(role: Role): User | null {
  if (typeof window === 'undefined') return null;
  try {
    if (role === 'admin') {
      const adminUserStr = sessionStorage.getItem(ADMIN_USER_KEY);
      return adminUserStr ? (JSON.parse(adminUserStr) as User) : null;
    }
    if (role === 'instructor') {
      const instructorStr = localStorage.getItem(INSTRUCTOR_USER_KEY);
      return instructorStr ? (JSON.parse(instructorStr) as User) : null;
    }
    const userStr = localStorage.getItem(USER_KEY) || localStorage.getItem(USER_SESSION_KEY);
    return userStr ? (JSON.parse(userStr) as User) : null;
  } catch (error) {
    console.error('Failed to get session for role:', error);
    return null;
  }
}

/**
 * セッションをクリア
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    // 両方のストレージからクリア
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    localStorage.removeItem(INSTRUCTOR_USER_KEY);
    localStorage.removeItem(INSTRUCTOR_SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
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
    return (
      sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' ||
      localStorage.getItem(USER_SESSION_KEY) === 'true' ||
      localStorage.getItem(INSTRUCTOR_SESSION_KEY) === 'true' ||
      localStorage.getItem(SESSION_KEY) === 'true'
    );
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
