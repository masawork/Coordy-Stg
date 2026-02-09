/**
 * サービス関連のAPI操作（API経由）
 */

export interface ServiceInput {
  instructorId?: string; // サーバー側で現在のインストラクターに紐付けるため省略可
  title: string;
  description?: string;
  category: string;
  deliveryType?: string;
  location?: string;
  price: number;
  duration: number;
  isActive?: boolean;
  // スケジュール設定
  recurrenceType?: 'ONCE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  availableDays?: string[];
  startTime?: string;
  endTime?: string;
  timezone?: string;
  validFrom?: string;
  validUntil?: string;
  maxParticipants?: number;
}

const parseJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

/**
 * サービス一覧取得
 */
export async function listServices(filters?: {
  category?: string;
  instructorId?: string;
  isActive?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.instructorId) params.append('instructorId', filters.instructorId);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));

  const res = await fetch(`/api/services?${params.toString()}`, { cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービス一覧の取得に失敗しました');
  }
  return data;
}

/**
 * サービス詳細取得
 */
export async function getService(id: string) {
  const res = await fetch(`/api/services/${id}`, { cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービスの取得に失敗しました');
  }
  return data;
}

/**
 * サービス作成
 */
export async function createService(input: ServiceInput) {
  const res = await fetch('/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービスの作成に失敗しました');
  }
  return data;
}

/**
 * サービス更新
 */
export async function updateService(
  id: string,
  updates: Partial<ServiceInput>
) {
  const res = await fetch(`/api/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービスの更新に失敗しました');
  }
  return data;
}

/**
 * サービス削除
 */
export async function deleteService(id: string) {
  const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービスの削除に失敗しました');
  }
  return data;
}

/**
 * サービス複製
 * 既存のサービスをベースに新しいサービスを作成
 */
export interface CloneServiceInput {
  title?: string;
  description?: string;
  recurrenceType?: 'ONCE' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
  availableDays?: string[];
  startTime?: string;
  endTime?: string;
  validFrom?: string;
  validUntil?: string;
  maxParticipants?: number;
  price?: number;
  duration?: number;
  isActive?: boolean;
}

export async function cloneService(id: string, overrides?: CloneServiceInput) {
  const res = await fetch(`/api/services/${id}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(overrides || {}),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービスの複製に失敗しました');
  }
  return data;
}
