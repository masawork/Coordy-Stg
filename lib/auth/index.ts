/**
 * 認証モジュールのエントリポイント
 */

// 型定義
export type { User, Role, SignUpParams, SignInParams, ConfirmSignUpParams, AuthSession } from './types';

// Cognito操作
export {
  registerUser,
  confirmEmail,
  loginUser,
  logoutUser,
  getCurrentAuthUser,
  getAuthSession,
  checkAuth,
} from './cognito';

// セッション管理
export {
  saveSession,
  getSession,
  clearSession,
  hasSession,
  getUserRole,
  hasRole,
  hasAnyRole,
} from './session';
