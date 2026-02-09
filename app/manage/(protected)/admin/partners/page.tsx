'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listPartners, createPartner, deletePartner } from '@/lib/api/partners-client';
import { Button } from '@/components/ui/button';
import {
  Plus,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
  Check,
  Link2,
  Users,
} from 'lucide-react';

export default function PartnersPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<{
    apiKey: string;
    secretKey: string;
    webhookSecret?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    websiteUrl: '',
    webhookUrl: '',
    paymentMode: 'COORDY',
    allowGuest: true,
    commissionRate: 0,
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const data = await listPartners();
      setPartners(data || []);
    } catch (err) {
      console.error('パートナー一覧取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.code) return;

    setCreating(true);
    try {
      const result = await createPartner({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        websiteUrl: form.websiteUrl || undefined,
        webhookUrl: form.webhookUrl || undefined,
        paymentMode: form.paymentMode,
        allowGuest: form.allowGuest,
        commissionRate: form.commissionRate / 100, // %→小数
      });

      setCredentials(result.credentials);
      setForm({
        name: '',
        code: '',
        description: '',
        websiteUrl: '',
        webhookUrl: '',
        paymentMode: 'COORDY',
        allowGuest: true,
        commissionRate: 0,
      });
      await loadPartners();
    } catch (err: any) {
      alert(err.message || '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を無効化しますか？`)) return;

    try {
      await deletePartner(id);
      await loadPartners();
    } catch (err) {
      console.error('削除エラー:', err);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">パートナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">外部連携パートナーの管理・APIキー発行</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          新規パートナー
        </Button>
      </div>

      {/* 認証情報表示（作成直後） */}
      {credentials && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <h3 className="font-bold text-yellow-800 mb-3">
            認証情報（この画面を閉じると再表示できません）
          </h3>
          <div className="space-y-3">
            <CredentialField
              label="APIキー"
              value={credentials.apiKey}
              copied={copiedField === 'apiKey'}
              onCopy={() => copyToClipboard(credentials.apiKey, 'apiKey')}
            />
            <CredentialField
              label="シークレットキー"
              value={credentials.secretKey}
              copied={copiedField === 'secretKey'}
              onCopy={() => copyToClipboard(credentials.secretKey, 'secretKey')}
            />
            {credentials.webhookSecret && (
              <CredentialField
                label="Webhookシークレット"
                value={credentials.webhookSecret}
                copied={copiedField === 'webhookSecret'}
                onCopy={() =>
                  copyToClipboard(credentials.webhookSecret!, 'webhookSecret')
                }
              />
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

      {/* 作成フォーム */}
      {showCreateForm && (
        <div className="mb-6 bg-white border rounded-lg p-5">
          <h3 className="font-bold mb-4">新規パートナー作成</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パートナー名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="アクティビティジャパン"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="activity-japan"
              />
              <p className="text-xs text-gray-400 mt-1">
                小文字英数字・ハイフンのみ
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WebサイトURL</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={form.webhookUrl}
                onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="https://partner.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">決済モード</label>
              <select
                value={form.paymentMode}
                onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowGuest"
                checked={form.allowGuest}
                onChange={(e) => setForm({ ...form, allowGuest: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="allowGuest" className="text-sm text-gray-700">
                ゲスト予約を許可
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate} disabled={creating || !form.name || !form.code}>
              {creating ? '作成中...' : '作成'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* パートナー一覧 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : partners.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Link2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>パートナーがまだ登録されていません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map((p: any) => (
            <div
              key={p.id}
              className={`bg-white border rounded-lg p-4 ${
                !p.isActive ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {p.isActive ? (
                    <ToggleRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800">{p.name}</h3>
                    <p className="text-xs text-gray-400">
                      コード: {p.code} / API: {p.apiKey?.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      {p.reservationCount || 0}件の予約
                    </div>
                    <div className="text-xs text-gray-400">
                      手数料: {(p.commissionRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/manage/admin/partners/${p.id}`)}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    {p.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CredentialField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <span className="text-sm font-medium text-yellow-800">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
          {value}
        </code>
        <button
          onClick={onCopy}
          className="shrink-0 p-2 rounded hover:bg-yellow-100"
          title="コピー"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>
    </div>
  );
}
