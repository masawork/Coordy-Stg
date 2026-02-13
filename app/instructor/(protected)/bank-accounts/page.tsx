'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount, BankAccount } from '@/lib/api/bank-client';
import { getBankNameByCode } from '@/lib/bank-codes';

export default function BankAccountsPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [error, setError] = useState('');
  const toHalfWidthDigits = (value: string) =>
    (value || '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const toDigits = (value: string) => toHalfWidthDigits(value).replace(/[^0-9]/g, '');
  const [formData, setFormData] = useState({
    accountType: 'savings',
    bankName: '',
    bankCode: '',
    branchName: '',
    branchCode: '',
    accountNumber: '',
    accountHolderName: '',
  });
  const [bankNameAutoFilled, setBankNameAutoFilled] = useState(false);

  // 銀行コード入力時に銀行名を自動入力
  const handleBankCodeChange = (value: string) => {
    const code = toDigits(value).slice(0, 4);
    setFormData((prev) => ({ ...prev, bankCode: code }));

    // 4桁入力されたら銀行名を検索
    if (code.length === 4) {
      const bankName = getBankNameByCode(code);
      if (bankName) {
        setFormData((prev) => ({ ...prev, bankName }));
        setBankNameAutoFilled(true);
      } else {
        setBankNameAutoFilled(false);
      }
    } else {
      setBankNameAutoFilled(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    setLoading(true);
    try {
      const accounts = await getBankAccounts();
      setBankAccounts(accounts);
    } catch (err: any) {
      console.error('Load bank accounts error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      accountType: 'savings',
      bankName: '',
      bankCode: '',
      branchName: '',
      branchCode: '',
      accountNumber: '',
      accountHolderName: '',
    });
    setBankNameAutoFilled(false);
    setEditingAccount(null);
    setShowForm(false);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      accountType: account.accountType,
      bankName: account.bankName,
      bankCode: account.bankCode,
      branchName: account.branchName,
      branchCode: account.branchCode,
      accountNumber: account.accountNumber || '',
      accountHolderName: account.accountHolderName,
    });
    setBankNameAutoFilled(false);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // クライアント側で全角→半角数字に統一し、基本チェック
      const normalized = {
        accountType: formData.accountType,
        bankName: formData.bankName.trim(),
        bankCode: toDigits(formData.bankCode).slice(0, 4),
        branchName: formData.branchName.trim(),
        branchCode: toDigits(formData.branchCode).slice(0, 3),
        accountNumber: toDigits(formData.accountNumber).slice(0, 7),
        accountHolderName: formData.accountHolderName.trim(),
      };

      if (!normalized.bankName || !normalized.branchName) {
        setError('銀行名と支店名を入力してください');
        return;
      }
      if (normalized.bankCode.length !== 4) {
        setError('銀行コードは4桁の数字で入力してください');
        return;
      }
      if (normalized.branchCode.length !== 3) {
        setError('支店コードは3桁の数字で入力してください');
        return;
      }
      if (normalized.accountNumber.length !== 7) {
        setError('口座番号は7桁の数字で入力してください');
        return;
      }

      if (editingAccount) {
        await updateBankAccount(editingAccount.id, normalized);
      } else {
        await createBankAccount(normalized);
      }
      resetForm();
      loadBankAccounts();
    } catch (err: any) {
      console.error(editingAccount ? 'Update bank account error:' : 'Create bank account error:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この銀行口座を削除しますか？')) {
      return;
    }

    try {
      await deleteBankAccount(id);
      loadBankAccounts();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        銀行口座管理
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 登録済み銀行口座一覧 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          登録済み口座
        </h2>

        {loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : bankAccounts.length === 0 ? (
          <p className="text-gray-500">登録されている銀行口座はありません</p>
        ) : (
          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 border border-gray-200 rounded-md hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-gray-900">
                        {account.bankName} {account.branchName}支店
                      </p>
                      {account.isDefault && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                          デフォルト
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        ✓ 登録済み
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {account.accountType === 'savings' ? '普通' : '当座'} ****{account.accountNumberMasked?.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {account.accountHolderName}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(account)}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 銀行口座追加・編集フォーム */}
      {showForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingAccount ? '銀行口座を編集' : '新しい銀行口座を追加'}
            </h2>
            <button
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 口座種別 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                口座種別
              </label>
              <select
                value={formData.accountType}
                onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="savings">普通</option>
                <option value="checking">当座</option>
              </select>
            </div>

            {/* 銀行コード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                銀行コード（4桁）
              </label>
              <input
                type="text"
                value={formData.bankCode}
                onChange={(e) => handleBankCodeChange(e.target.value)}
                placeholder="例: 0005"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={4}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                コードを入力すると銀行名が自動入力されます
              </p>
            </div>

            {/* 銀行名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                銀行名
                {bankNameAutoFilled && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    ✓ 自動入力済み
                  </span>
                )}
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => {
                  setFormData({ ...formData, bankName: e.target.value });
                  setBankNameAutoFilled(false);
                }}
                placeholder="例: 三菱UFJ銀行"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  bankNameAutoFilled
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300'
                }`}
                required
              />
            </div>

            {/* 支店名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支店名
              </label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                placeholder="例: 渋谷"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* 支店コード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支店コード（3桁）
              </label>
              <input
                type="text"
                value={formData.branchCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    branchCode: toDigits(e.target.value).slice(0, 3),
                  })
                }
                placeholder="例: 123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={3}
                required
              />
            </div>

            {/* 口座番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                口座番号（7桁）
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    accountNumber: toDigits(e.target.value).slice(0, 7),
                  })
                }
                placeholder="例: 1234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={7}
                required
              />
            </div>

            {/* 口座名義人 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                口座名義人（カタカナ）
              </label>
              <input
                type="text"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                placeholder="例: ヤマダタロウ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                全角カタカナで入力してください
              </p>
            </div>

            <Button type="submit" className="w-full">
              {editingAccount ? '変更を保存' : '銀行口座を登録'}
            </Button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingAccount(null);
            setShowForm(true);
          }}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 transition-colors"
        >
          + 新しい銀行口座を追加
        </button>
      )}

      {/* 重要な注意事項 */}
      <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-sm font-semibold text-red-900 mb-2">
          ⚠️ 重要：口座情報について
        </h3>
        <p className="text-sm text-red-800">
          口座情報が間違っている場合、そのまま別の口座に振り込まれてしまう可能性があります。
          登録前に口座番号・支店コードなどを必ずご確認ください。
          間違った振込先への送金は返金できない場合があります。
        </p>
      </div>

      {/* 説明 */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 銀行口座について
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 口座の登録・変更・削除時には、登録メールアドレスに通知が届きます</li>
          <li>• 口座情報は暗号化されて安全に保管されます</li>
        </ul>
      </div>
    </div>
  );
}
