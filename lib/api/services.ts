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
 * 検索フィルタ型定義
 */
export interface ServiceSearchFilters {
  q?: string;
  category?: string;
  instructorId?: string;
  isActive?: boolean;
  deliveryType?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

/**
 * サービスサマリー型（一覧APIレスポンス用）
 */
export interface ServiceSummary {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  deliveryType: string;
  location?: string | null;
  price: number;
  duration: number;
  isActive: boolean;
  maxParticipants: number;
  createdAt: string;
  instructorId: string;
  instructor?: {
    id: string;
    user?: { name?: string; image?: string | null };
  };
  images?: Array<{ url: string; sortOrder: number }>;
  schedules?: Array<{ id: string; date: string; startTime: string; endTime: string; isCancelled: boolean }>;
  campaigns?: Array<{ id: string; type: string; isActive: boolean }>;
}

/**
 * ページネーション付きレスポンス型定義
 */
export interface ServiceSearchResult {
  services: ServiceSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * サービス検索（ページネーション・ソート対応）
 */
export async function searchServices(filters?: ServiceSearchFilters): Promise<ServiceSearchResult> {
  const params = new URLSearchParams();
  if (filters?.q) params.append('q', filters.q);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.instructorId) params.append('instructorId', filters.instructorId);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.deliveryType) params.append('deliveryType', filters.deliveryType);
  if (filters?.location) params.append('location', filters.location);
  if (filters?.priceMin !== undefined) params.append('priceMin', String(filters.priceMin));
  if (filters?.priceMax !== undefined) params.append('priceMax', String(filters.priceMax));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const res = await fetch(`/api/services?${params.toString()}`, { cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'サービス一覧の取得に失敗しました');
  }
  return data as ServiceSearchResult;
}

/**
 * サービス一覧取得（後方互換ラッパー）
 * 既存の呼び出し元はそのまま動作する（配列を返す）
 */
export async function listServices(filters?: {
  category?: string;
  instructorId?: string;
  isActive?: boolean;
}) {
  const result = await searchServices(filters);
  return result.services;
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
