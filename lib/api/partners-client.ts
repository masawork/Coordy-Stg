/**
 * パートナー管理 APIクライアント
 */

export async function listPartners() {
  const res = await fetch('/api/admin/partners');
  if (!res.ok) throw new Error('パートナー一覧の取得に失敗しました');
  return res.json();
}

export async function getPartner(id: string) {
  const res = await fetch(`/api/admin/partners/${id}`);
  if (!res.ok) throw new Error('パートナーの取得に失敗しました');
  return res.json();
}

export async function createPartner(data: {
  name: string;
  code: string;
  description?: string;
  websiteUrl?: string;
  logoUrl?: string;
  webhookUrl?: string;
  paymentMode?: string;
  allowGuest?: boolean;
  requirePhone?: boolean;
  instructorIds?: string[];
  serviceIds?: string[];
  commissionRate?: number;
}) {
  const res = await fetch('/api/admin/partners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'パートナーの作成に失敗しました');
  }
  return res.json();
}

export async function updatePartner(
  id: string,
  data: Record<string, unknown>,
) {
  const res = await fetch(`/api/admin/partners/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('パートナーの更新に失敗しました');
  return res.json();
}

export async function deletePartner(id: string) {
  const res = await fetch(`/api/admin/partners/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('パートナーの削除に失敗しました');
  return res.json();
}

export async function regeneratePartnerKeys(
  id: string,
  regenerateWebhookSecret = false,
) {
  const res = await fetch(`/api/admin/partners/${id}/regenerate-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ regenerateWebhookSecret }),
  });
  if (!res.ok) throw new Error('キーの再生成に失敗しました');
  return res.json();
}
