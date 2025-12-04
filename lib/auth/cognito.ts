/**
 * AWS Cognito 認証ヘルパー関数
 * Amplify Gen2 の認証機能を使用
 */

import { signUp, signIn, signOut, confirmSignUp, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import type { SignUpParams, SignInParams, ConfirmSignUpParams, User, AuthSession, Role } from './types';

/**
 * ユーザー登録
 */
export async function registerUser(params: SignUpParams): Promise<{ userId: string; email: string }> {
  try {
    const { email, password, name, role } = params;

    const { userId } = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
          'custom:role': role,
          'custom:userType': role === 'instructor' ? 'CREATOR' : 'CLIENT',
        },
      },
    });

    return {
      userId: userId || email,
      email,
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.message || '登録に失敗しました');
  }
}

/**
 * メールアドレス確認
 */
export async function confirmEmail(params: ConfirmSignUpParams): Promise<void> {
  try {
    await confirmSignUp({
      username: params.email,
      confirmationCode: params.code,
    });
  } catch (error: any) {
    console.error('Confirmation error:', error);
    throw new Error(error.message || 'メール確認に失敗しました');
  }
}

/**
 * ログイン
 */
export async function loginUser(params: SignInParams): Promise<{ user: User }> {
  try {
    const { email, password } = params;

    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password,
    });

    if (!isSignedIn) {
      throw new Error('ログインに失敗しました');
    }

    // ユーザー情報を取得
    const user = await getCurrentAuthUser();

    return { user };
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(error.message || 'ログインに失敗しました');
  }
}

/**
 * ログアウト
 */
export async function logoutUser(): Promise<void> {
  try {
    console.log('🚪 ログアウト処理開始');
    // Cognitoセッションをグローバルにクリア（すべてのデバイスでサインアウト）
    await signOut({ global: true });
    console.log('✅ Cognitoセッションをグローバルにクリアしました');
  } catch (error: any) {
    console.error('❌ Logout error:', error);
    // グローバルサインアウトに失敗した場合は通常のサインアウトを試行
    try {
      console.log('⚠️ グローバルサインアウト失敗、通常のサインアウトを試行');
      await signOut();
      console.log('✅ Cognitoセッションをクリアしました');
    } catch (fallbackError: any) {
      console.error('❌ Fallback logout error:', fallbackError);
      throw new Error(fallbackError.message || 'ログアウトに失敗しました');
    }
  }
}

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentAuthUser(): Promise<User> {
  try {
    const { username, userId, signInDetails } = await getCurrentUser();

    // セッション情報から属性を取得
    const session = await fetchAuthSession();
    const tokens = session.tokens;

    if (!tokens?.idToken) {
      throw new Error('トークンが見つかりません');
    }

    // IDトークンのペイロードから属性を取得
    const payload = tokens.idToken.payload;

    // グループからロールを判定（より確実）
    const groups = (payload['cognito:groups'] as string[]) || [];
    let role: Role = 'user';

    if (groups.includes('ADMINS')) {
      role = 'admin';
    } else if (groups.includes('CREATORS')) {
      role = 'instructor';
    } else if (groups.includes('CLIENTS')) {
      role = 'user';
    } else {
      // カスタム属性からフォールバック
      role = ((payload['custom:role'] as string) || 'user') as Role;
    }

    console.log('🔐 ロール判定:', { userId, groups, role, customRole: payload['custom:role'] });

    const user: User = {
      userId: userId,
      email: (payload.email as string) || username,
      name: (payload.name as string) || '',
      role: role,
      emailVerified: payload.email_verified as boolean,
    };

    return user;
  } catch (error: any) {
    console.error('Get current user error:', error);
    throw new Error(error.message || 'ユーザー情報の取得に失敗しました');
  }
}

/**
 * セッション情報を取得
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const session = await fetchAuthSession();

    if (!session.tokens) {
      return null;
    }

    const user = await getCurrentAuthUser();

    return {
      user,
      accessToken: session.tokens.accessToken.toString(),
      idToken: session.tokens.idToken.toString(),
    };
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * 認証状態をチェック
 */
export async function checkAuth(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return !!session.tokens;
  } catch (error) {
    return false;
  }
}
