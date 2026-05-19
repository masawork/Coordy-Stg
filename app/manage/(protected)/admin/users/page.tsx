'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { Users, Search, CreditCard, X } from 'lucide-react';
import { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { fetchManageUsers, updateUserRoleRemote, getCreditLimit, updateCreditLimit } from '@/lib/api/admin-client';

interface CreditLimitModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onUpdated: () => void;
}

function CreditLimitModal({ userId, userName, onClose, onUpdated }: CreditLimitModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creditLimit, setCreditLimit] = useState<string>('');
  const [hasLimit, setHasLimit] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadCreditLimit();
  }, [userId]);

  const loadCreditLimit = async () => {
    try {
      setLoading(true);
      const data = await getCreditLimit(userId);
      setMonthlyUsage(data.monthlyUsage || 0);
      setBalance(data.balance || 0);
      if (data.creditLimit !== null && data.creditLimit !== undefined) {
        setHasLimit(true);
        setCreditLimit(String(data.creditLimit));
      } else {
        setHasLimit(false);
        setCreditLimit('');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const limitValue = hasLimit ? Number(creditLimit) : null;
      if (hasLimit && (isNaN(limitValue as number) || (limitValue as number) < 0)) {
        alert('有効な金額を入力してください');
        setSaving(false);
        return;
      }
      await updateCreditLimit(userId, limitValue);
      onUpdated();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">クレジット使用制限</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">ユーザー: {userName}</p>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ポイント残高:</span>
                <span className="font-medium">¥{balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">今月のクレジット使用額:</span>
                <span className="font-medium">¥{monthlyUsage.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasLimit}
                  onChange={(e) => {
                    setHasLimit(e.target.checked);
                    if (!e.target.checked) setCreditLimit('');
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">月額クレジット使用上限を設定する</span>
              </label>

              {hasLimit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    月額上限金額（円）
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="例: 50000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    0を設定するとクレジット決済が無効になります
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {saving ? '保存中...' : '保存'}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [creditLimitUser, setCreditLimitUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await fetchManageUsers({
        search: searchTerm || undefined,
        limit: 50,
      });
      setUsers(result.users || []);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!confirm(`このユーザーのロールを${newRole}に変更しますか？`)) {
      return;
    }

    setUpdatingId(userId);
    try {
      await updateUserRoleRemote(userId, newRole);
      await loadUsers();
    } catch (error) {
      alert('ロールの更新に失敗しました');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="mt-1 text-gray-600">システムに登録されているユーザーを管理します</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="ユーザーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    名前
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setCreditLimitUser({ id: user.id, name: user.name })}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                          title="クレジット制限"
                        >
                          <CreditCard className="h-3 w-3" />
                          制限
                        </button>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={updatingId === user.id}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="USER">USER</option>
                          <option value="INSTRUCTOR">INSTRUCTOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">ユーザーが見つかりません</p>
          </div>
        )}
      </div>

      {creditLimitUser && (
        <CreditLimitModal
          userId={creditLimitUser.id}
          userName={creditLimitUser.name}
          onClose={() => setCreditLimitUser(null)}
          onUpdated={loadUsers}
        />
      )}
    </div>
  );
}
