/**
 * キャンペーン関連のAPI操作（API経由）
 */

export type CampaignType =
  | 'PERCENT_OFF'
  | 'FIXED_DISCOUNT'
  | 'TRIAL'
  | 'EARLY_BIRD'
  | 'BULK'
  | 'FIRST_TIME'
  | 'REFERRAL'
  | 'SEASONAL';

export interface CampaignInput {
  serviceId?: string;
  name: string;
  description?: string;
  type: CampaignType;
  discountPercent?: number;
  discountAmount?: number;
  fixedPrice?: number;
  minPurchaseAmount?: number;
  minBookingCount?: number;
  maxUsagePerUser?: number;
  maxTotalUsage?: number;
  isFirstTimeOnly?: boolean;
  earlyBirdDays?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
}

export interface Campaign {
  id: string;
  serviceId?: string;
  instructorId: string;
  name: string;
  description?: string;
  type: CampaignType;
  discountPercent?: number;
  discountAmount?: number;
  fixedPrice?: number;
  minPurchaseAmount?: number;
  minBookingCount?: number;
  maxUsagePerUser?: number;
  maxTotalUsage?: number;
  isFirstTimeOnly: boolean;
  earlyBirdDays?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  currentUsage: number;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    title: string;
  };
  instructor?: {
    id: string;
    user: {
      name: string;
    };
  };
}

const parseJson = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

/**
 * キャンペーン一覧取得
 */
export async function listCampaigns(filters?: {
  instructorId?: string;
  serviceId?: string;
  isActive?: boolean;
  activeOnly?: boolean;
}): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (filters?.instructorId) params.append('instructorId', filters.instructorId);
  if (filters?.serviceId) params.append('serviceId', filters.serviceId);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.activeOnly) params.append('activeOnly', 'true');

  const res = await fetch(`/api/campaigns?${params.toString()}`, { cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'キャンペーン一覧の取得に失敗しました');
  }
  return data;
}

/**
 * キャンペーン詳細取得
 */
export async function getCampaign(id: string): Promise<Campaign> {
  const res = await fetch(`/api/campaigns/${id}`, { cache: 'no-store' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'キャンペーンの取得に失敗しました');
  }
  return data;
}

/**
 * キャンペーン作成
 */
export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'キャンペーンの作成に失敗しました');
  }
  return data;
}

/**
 * キャンペーン更新
 */
export async function updateCampaign(
  id: string,
  updates: Partial<CampaignInput>
): Promise<Campaign> {
  const res = await fetch(`/api/campaigns/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'キャンペーンの更新に失敗しました');
  }
  return data;
}

/**
 * キャンペーン削除
 */
export async function deleteCampaign(id: string): Promise<void> {
  const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
  const data = await parseJson(res);
  if (!res.ok) {
    throw new Error(data.error || 'キャンペーンの削除に失敗しました');
  }
}

/**
 * キャンペーンタイプのラベルを取得
 */
export function getCampaignTypeLabel(type: CampaignType): string {
  const labels: Record<CampaignType, string> = {
    PERCENT_OFF: '割引率',
    FIXED_DISCOUNT: '定額割引',
    TRIAL: '体験価格',
    EARLY_BIRD: '早期予約割引',
    BULK: '回数券',
    FIRST_TIME: '初回限定',
    REFERRAL: '紹介割引',
    SEASONAL: '季節限定',
  };
  return labels[type] || type;
}

/**
 * キャンペーンの割引額を計算
 */
export function calculateDiscount(campaign: Campaign, originalPrice: number): number {
  switch (campaign.type) {
    case 'PERCENT_OFF':
      return Math.floor(originalPrice * (campaign.discountPercent || 0) / 100);
    case 'FIXED_DISCOUNT':
      return Math.min(campaign.discountAmount || 0, originalPrice);
    case 'TRIAL':
      return Math.max(0, originalPrice - (campaign.fixedPrice || 0));
    case 'EARLY_BIRD':
      return Math.floor(originalPrice * (campaign.discountPercent || 0) / 100);
    case 'FIRST_TIME':
      if (campaign.discountPercent) {
        return Math.floor(originalPrice * campaign.discountPercent / 100);
      }
      return campaign.discountAmount || 0;
    default:
      return 0;
  }
}
