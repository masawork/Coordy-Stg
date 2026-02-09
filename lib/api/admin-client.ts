/**
 * クライアント側から管理APIを呼び出すヘルパー
 */

import { UserRole } from '@prisma/client';

export async function fetchIdentityRequests(role: 'user' | 'instructor') {
  const res = await fetch(`/api/manage/identity-requests?role=${role}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '本人確認データの取得に失敗しました');
  }
  return res.json();
}

export async function fetchManageUsers(params: { search?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));

  const res = await fetch(`/api/manage/users?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ユーザー取得に失敗しました');
  }
  return res.json();
}

export async function updateUserRoleRemote(userId: string, role: UserRole) {
  const res = await fetch('/api/manage/users/set-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ロール更新に失敗しました');
  }
  return res.json();
}

