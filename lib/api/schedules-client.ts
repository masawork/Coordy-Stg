/**
 * スケジュールAPI クライアント側ヘルパー
 */

export interface ScheduleSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isGenerated: boolean;
  availableSlots: number;
}

export interface ServiceScheduleResponse {
  service: {
    id: string;
    title: string;
    description?: string;
    category: string;
    price: number;
    duration: number;
    maxParticipants: number;
    instructor: {
      id: string;
      name: string;
      image?: string;
    };
  };
  schedules: ScheduleSlot[];
}

export interface ScheduleWithService {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isGenerated: boolean;
  service: {
    id: string;
    title: string;
    description?: string;
    category: string;
    price: number;
    duration: number;
    maxParticipants: number;
    instructorId: string;
    instructor: {
      id: string;
      user: {
        name: string;
        image?: string;
      };
    };
  };
}

/**
 * 特定サービスのスケジュール取得
 */
export async function getServiceSchedules(
  serviceId: string,
  from?: string,
  to?: string
): Promise<ServiceScheduleResponse> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const url = `/api/schedules/service/${serviceId}${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'スケジュールの取得に失敗しました');
  }

  return response.json();
}

/**
 * スケジュール一覧取得（フィルター付き）
 */
export async function getSchedules(options?: {
  from?: string;
  to?: string;
  serviceId?: string;
  instructorId?: string;
  category?: string;
}): Promise<ScheduleWithService[]> {
  const params = new URLSearchParams();

  if (options?.from) params.append('from', options.from);
  if (options?.to) params.append('to', options.to);
  if (options?.serviceId) params.append('serviceId', options.serviceId);
  if (options?.instructorId) params.append('instructorId', options.instructorId);
  if (options?.category) params.append('category', options.category);

  const url = `/api/schedules${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'スケジュールの取得に失敗しました');
  }

  return response.json();
}

/**
 * スケジュール作成（インストラクター用）
 */
export async function createSchedule(data: {
  serviceId: string;
  date: string;
  startTime: string;
  endTime?: string;
}) {
  const response = await fetch('/api/schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'スケジュールの作成に失敗しました');
  }

  return response.json();
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

/**
 * 日付を短くフォーマット
 */
export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

/**
 * 時刻をフォーマット
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * 日付範囲を生成（週単位）
 */
export function getWeekRange(date: Date): { from: string; to: string } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // 週の始まり（日曜）
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 週の終わり（土曜）

  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

/**
 * 日付範囲を生成（月単位）
 */
export function getMonthRange(date: Date): { from: string; to: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}
