/**
 * AWS Cognito 認証ヘルパー関数
 * Amplify Gen2 の認証機能を使用
 */

// Amplify初期化を確実に行う（このモジュールが使われる前に初期化）
import '@/src/lib/amplifyClient';

import { signUp, signIn, signOut, confirmSignUp, confirmSignIn, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import type { SignUpParams, SignInParams, ConfirmSignUpParams, User, AuthSession, Role } from './types';

/**
 * ユーザー登録
 */
export async function registerUser(params: SignUpParams): Promise<{ userId: string; email: string }> {
  try {
    const { email, password, name, role } = params;

    if (role === 'admin') {
      throw new Error('管理者アカウントはCognitoコンソールでADMINSグループに追加して作成してください');
    }

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
 * ログイン結果の型
 */
export interface LoginResult {
  user?: User;
  nextStep?: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' | 'DONE';
}

/**
 * ログイン
 * 既に別アカウントでログイン中の場合、自動的にサインアウトしてから新しいアカウントでサインインする
 */
export async function loginUser(params: SignInParams): Promise<LoginResult> {
  const { email, password } = params;

  // 内部のサインイン処理
  const attemptSignIn = async (): Promise<LoginResult> => {
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password,
    });

    // NEW_PASSWORD_REQUIRED チャレンジの場合
    if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      console.log('🔐 パスワード変更が必要です');
      return {
        nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      };
    }

    if (!isSignedIn) {
      throw new Error('ログインに失敗しました');
    }

    // ユーザー情報を取得
    const user = await getCurrentAuthUser();

    return { user, nextStep: 'DONE' };
  };

  try {
    return await attemptSignIn();
  } catch (error: any) {
    console.error('Login error:', error);
    const errorName = error?.name || error?.code;
    const isAlreadySignedIn =
      errorName === 'UserAlreadyAuthenticatedException' ||
      error?.message?.includes('already a signed in user');

    // 既に別アカウントでログイン中の場合、自動的にサインアウトしてリトライ
    if (isAlreadySignedIn) {
      console.log('🔄 既にログイン中のため、自動サインアウトしてリトライします');
      try {
        // 現在のセッションをサインアウト
        await signOut();
        console.log('✅ 自動サインアウト完了、新しいアカウントでサインインします');

        // リトライ
        return await attemptSignIn();
      } catch (retryError: any) {
        console.error('Retry login error:', retryError);
        // リトライに失敗した場合は元のエラーを投げる
        const wrappedError = new Error(retryError?.message || 'ログインに失敗しました');
        (wrappedError as any).name = retryError?.name || 'Error';
        (wrappedError as any).code = retryError?.code || retryError?.name;
        throw wrappedError;
      }
    }

    // その他のエラーはそのまま投げる
    const wrappedError = new Error(error?.message || 'ログインに失敗しました');
    (wrappedError as any).name = errorName || 'Error';
    (wrappedError as any).code = error?.code || errorName;
    throw wrappedError;
  }
}

/**
 * 新しいパスワードを設定（FORCE_CHANGE_PASSWORD 状態のユーザー用）
 */
export async function completeNewPasswordChallenge(newPassword: string): Promise<{ user: User }> {
  try {
    console.log('🔐 新しいパスワードを設定します');
    const { isSignedIn, nextStep } = await confirmSignIn({
      challengeResponse: newPassword,
    });

    if (!isSignedIn) {
      throw new Error('パスワードの設定に失敗しました');
    }

    // ユーザー情報を取得
    const user = await getCurrentAuthUser();

    console.log('✅ パスワード設定完了:', { userId: user.userId, role: user.role });
    return { user };
  } catch (error: any) {
    console.error('Password challenge error:', error);
    throw new Error(error?.message || 'パスワードの設定に失敗しました');
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
    const displayName =
      (payload['custom:displayName'] as string) ||
      (payload.name as string) ||
      '';

    // カスタム属性を取得
    const customRole = payload['custom:role'] as string | undefined;
    const customUserType = payload['custom:userType'] as string | undefined;

    if (groups.includes('ADMINS')) {
      role = 'admin';
    } else if (groups.includes('CREATORS')) {
      role = 'instructor';
    } else if (groups.includes('CLIENTS')) {
      role = 'user';
    } else if (customRole === 'instructor' || customRole === 'admin' || customRole === 'user') {
      // カスタム属性からフォールバック（明示的に valid なロールをチェック）
      role = customRole as Role;
    } else if (customUserType === 'CREATOR') {
      // custom:userType からもフォールバック
      role = 'instructor';
    } else if (customUserType === 'CLIENT') {
      role = 'user';
    }

    console.log('🔐 ロール判定:', { userId, groups, role, customRole, customUserType });

    const user: User = {
      userId: userId,
      email: (payload.email as string) || username,
      name: (payload.name as string) || '',
      displayName,
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

    if (!session.tokens || !session.tokens.idToken) {
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
