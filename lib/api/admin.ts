/**
 * 管理者向けAPI操作（クライアント用）
 */

/**
 * 期限切れ振込申請のクリーンアップ
 * 30日以上経過した未処理の振込申請を自動的にキャンセル
 */
export async function cleanupExpiredCharges() {
  try {
    const response = await fetch('/api/admin/pending-charges/cleanup', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'クリーンアップに失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Cleanup expired charges error:', error);
    // エラーは握りつぶす（バックグラウンド処理のため）
    return { success: false, expiredCount: 0 };
  }
}

/**
 * 銀行振込申請一覧取得
 */
export async function listPendingCharges() {
  try {
    const response = await fetch('/api/admin/pending-charges', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '承認待ちチャージの取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('List pending charges error:', error);
    throw error;
  }
}

/**
 * 銀行振込承認
 */
export async function approveCharge(transactionId: string) {
  try {
    const response = await fetch(`/api/admin/pending-charges/${transactionId}/approve`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '承認に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Approve charge error:', error);
    throw error;
  }
}

/**
 * 銀行振込却下
 */
export async function rejectCharge(transactionId: string, reason?: string) {
  try {
    const response = await fetch(`/api/admin/pending-charges/${transactionId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '却下に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Reject charge error:', error);
    throw error;
  }
}

/**
 * 統計情報取得
 */
export async function getAdminStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '統計情報の取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Get admin stats error:', error);
    throw error;
  }
}

/**
 * ユーザー一覧取得
 */
export async function listUsers(filters?: {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));

    const response = await fetch(`/api/admin/users?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ユーザー一覧の取得に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('List users error:', error);
    throw error;
  }
}

/**
 * ユーザーロール更新
 */
export async function updateUserRole(userId: string, role: string) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ロールの更新に失敗しました');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Update user role error:', error);
    throw error;
  }
}
