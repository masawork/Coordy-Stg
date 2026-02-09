'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPartner, updatePartner, regeneratePartnerKeys } from '@/lib/api/partners-client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Calendar,
  Users,
} from 'lucide-react';

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{
    apiKey: string;
    secretKey: string;
    webhookSecret?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    websiteUrl: '',
    logoUrl: '',
    webhookUrl: '',
    paymentMode: 'COORDY',
    allowGuest: true,
    requirePhone: false,
    commissionRate: 0,
    isActive: true,
  });

  useEffect(() => {
    loadPartner();
  }, [partnerId]);

  const loadPartner = async () => {
    try {
      setLoading(true);
      const data = await getPartner(partnerId);
      setPartner(data);
      setForm({
        name: data.name || '',
        description: data.description || '',
        websiteUrl: data.websiteUrl || '',
        logoUrl: data.logoUrl || '',
        webhookUrl: data.webhookUrl || '',
        paymentMode: data.paymentMode || 'COORDY',
        allowGuest: data.allowGuest ?? true,
        requirePhone: data.requirePhone ?? false,
        commissionRate: (data.commissionRate || 0) * 100,
        isActive: data.isActive ?? true,
      });
    } catch (err) {
      console.error('パートナー取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePartner(partnerId, {
        name: form.name,
        description: form.description || null,
        websiteUrl: form.websiteUrl || null,
        logoUrl: form.logoUrl || null,
        webhookUrl: form.webhookUrl || null,
        paymentMode: form.paymentMode,
        allowGuest: form.allowGuest,
        requirePhone: form.requirePhone,
        commissionRate: form.commissionRate / 100,
        isActive: form.isActive,
      });
      await loadPartner();
      alert('保存しました');
    } catch (err: any) {
      alert(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!confirm('APIキーとシークレットキーを再生成しますか？\n既存の認証情報は無効になります。')) {
      return;
    }

    try {
      const result = await regeneratePartnerKeys(
        partnerId,
        !!form.webhookUrl,
      );
      setCredentials(result.credentials);
      await loadPartner();
    } catch (err: any) {
      alert(err.message || 'キー再生成に失敗しました');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">読み込み中...</div>;
  }

  if (!partner) {
    return <div className="p-6 text-center text-red-500">パートナーが見つかりません</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/manage/admin/partners')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> パートナー一覧に戻る
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{partner.name}</h1>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              partner.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {partner.isActive ? '有効' : '無効'}
          </span>
          <span className="text-sm text-gray-400">
            予約数: {partner.reservationCount || 0}件
          </span>
        </div>
      </div>

      {/* 認証情報表示 */}
      {credentials && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h3 className="font-bold text-yellow-800 mb-3">
            新しい認証情報（この画面を閉じると再表示できません）
          </h3>
          <div className="space-y-3">
            {Object.entries(credentials).map(([key, value]) =>
              value ? (
                <div key={key}>
                  <span className="text-sm font-medium text-yellow-800">{key}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
                      {value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="shrink-0 p-2 rounded hover:bg-yellow-100"
                    >
                      {copiedField === key ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null,
            )}
          </div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCredentials(null)}
          >
            閉じる
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 設定フォーム */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-5">
          <h2 className="font-bold mb-4">基本設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パートナー名</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">コード</label>
              <input
                type="text"
                value={partner.code}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WebサイトURL</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ロゴURL</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済モード</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="COORDY">Coordy側決済</option>
                <option value="EXTERNAL">外部決済済み</option>
                <option value="BOTH">両方対応</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手数料率（%）</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionRate}
                onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowGuest}
                  onChange={(e) => setForm({ ...form, allowGuest: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">ゲスト予約を許可</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requirePhone}
                  onChange={(e) => setForm({ ...form, requirePhone: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">電話番号を必須にする</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">有効</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {/* APIキー情報 */}
          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-bold mb-3">API情報</h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500">パートナーID</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono break-all">{partner.id}</code>
                  <button
                    onClick={() => copyToClipboard(partner.id, 'id')}
                    className="shrink-0 p-1"
                  >
                    {copiedField === 'id' ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500">APIキー</span>
                <code className="block text-xs font-mono text-gray-500 break-all">
                  {partner.apiKey}
                </code>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={handleRegenerateKeys}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              キー再生成
            </Button>
          </div>

          {/* 最近の予約 */}
          <div className="bg-white border rounded-lg p-5">
            <h3 className="font-bold mb-3">最近の予約</h3>
            {partner.externalReservations?.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {partner.externalReservations.map((er: any) => (
                  <div
                    key={er.id}
                    className="text-sm border-b border-gray-100 pb-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {er.reservation?.service?.title || '不明'}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          er.reservation?.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-700'
                            : er.reservation?.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {er.reservation?.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {er.reservation?.guestUser?.name} / {er.reservation?.guestUser?.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(er.createdAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">まだ予約がありません</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
