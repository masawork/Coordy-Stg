/**
 * プロフィールAPI クライアント側ヘルパー
 * クライアントコンポーネントから安全に呼び出せる関数
 */

export interface ClientProfileInput {
  userId: string;
  fullName?: string;
  displayName?: string;
  address?: string;
  phoneNumber?: string;
  dateOfBirth?: Date | string;
  gender?: string;
  isProfileComplete?: boolean;
}

/**
 * プロフィール取得
 */
export async function getClientProfile(userId: string) {
  try {
    const response = await fetch(`/api/profile/${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 404) {
      return null; // プロフィールが存在しない
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'プロフィールの取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get client profile error:', error);
    return null;
  }
}

/**
 * プロフィール作成
 */
export async function createClientProfile(input: ClientProfileInput) {
  try {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'プロフィールの作成に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Create client profile error:', error);
    throw error;
  }
}

/**
 * プロフィール更新
 */
export async function updateClientProfile(
  userId: string,
  updates: Partial<ClientProfileInput>
) {
  try {
    const response = await fetch(`/api/profile/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'プロフィールの更新に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Update client profile error:', error);
    throw error;
  }
}

/**
 * プロフィール完了チェック
 * userIdはオプション（指定されない場合はcheck-role APIを使用）
 */
export async function isProfileComplete(userId?: string): Promise<boolean> {
  try {
    // check-role APIを使ってPrismaユーザーとプロフィールを取得
    const response = await fetch('/api/auth/check-role?role=user', {
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const { profile } = await response.json();
    return profile?.isProfileComplete === true;
  } catch (error) {
    console.error('isProfileComplete error:', error);
    return false;
  }
}

/**
 * 現在のユーザーのプロフィール取得（userIdなし）
 * セッションから自動的にuserIdを取得
 */
export async function getProfile(userId?: string) {
  try {
    // userIdが指定されていればそれを使用、なければAPIが自動判定
    const url = userId ? `/api/profile/${userId}` : '/api/profile/me';
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.status === 404) {
      return null; // プロフィールが存在しない
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'プロフィールの取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get profile error:', error);
    return null;
  }
}

