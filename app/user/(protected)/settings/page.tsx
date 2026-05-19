'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';
import { getClientProfile, updateClientProfile } from '@/lib/api/profile-client';
import { signOut as betterAuthSignOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { User, Bell, Shield, ShieldBan, CreditCard, HelpCircle, LogOut, Store, UserX } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hasInstructorRole, setHasInstructorRole] = useState(false);
  const [registeringInstructor, setRegisteringInstructor] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      loadProfile(session.user.id);

      fetch('/api/auth/check-role?role=INSTRUCTOR')
        .then(r => r.ok ? r.json() : null)
        .then(d => setHasInstructorRole(!!d?.user))
        .catch(() => {});
    };
    loadData();
  }, [router]);

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const profileData = await getClientProfile(userId);
      setProfile(profileData);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) {
      return;
    }

    try {
      await betterAuthSignOut();
      clearSession();
      router.push('/login');
    } catch (error) {
    }
  };

  const handleBecomeInstructor = async () => {
    if (!confirm('出品者として登録しますか？\n登録後、出品者プロフィールの設定が必要です。')) return;
    setRegisteringInstructor(true);
    try {
      await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'instructor' }),
      });
      setHasInstructorRole(true);
      router.push('/instructor/profile/setup');
    } catch {
      alert('登録に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setRegisteringInstructor(false);
    }
  };

  const handleDeleteAccount = async () => {
    const first = confirm('本当に退会しますか？\n退会すると全てのアカウントデータが無効化されます。この操作は取り消せません。');
    if (!first) return;
    const second = prompt('退会を確定するには「DELETE」と入力してください');
    if (second !== 'DELETE') {
      alert('入力が正しくありません。退会はキャンセルされました。');
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || '退会に失敗しました');
        return;
      }
      clearSession();
      window.location.href = '/login';
    } catch {
      alert('退会に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setDeletingAccount(false);
    }
  };

  const settingsItems = [
    {
      icon: User,
      label: 'プロフィール設定',
      description: '名前、住所、電話番号などの基本情報',
      onClick: () => router.push('/user/profile'),
    },
    {
      icon: Bell,
      label: '通知設定',
      description: 'メールやプッシュ通知の設定',
      onClick: () => alert('通知設定は今後実装予定です'),
    },
    {
      icon: Shield,
      label: 'プライバシーとセキュリティ',
      description: 'パスワード変更、二段階認証など',
      onClick: () => alert('セキュリティ設定は今後実装予定です'),
    },
    {
      icon: CreditCard,
      label: '支払い設定',
      description: '支払い方法の管理',
      onClick: () => router.push('/user/payment'),
    },
    {
      icon: ShieldBan,
      label: 'ブロック管理',
      description: 'ブロック中の出品者の管理',
      onClick: () => router.push('/user/settings/blocked'),
    },
    {
      icon: HelpCircle,
      label: 'ヘルプ・お問い合わせ',
      description: 'よくある質問とサポート',
      onClick: () => alert('ヘルプは今後実装予定です'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">設定</h1>
          <p className="mt-2 text-gray-600">
            アカウントとアプリケーションの設定を管理できます
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* アカウント情報 */}
            {profile && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  アカウント情報
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">名前</span>
                    <span className="font-medium">{profile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">メールアドレス</span>
                    <span className="font-medium">{profile?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ロール</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      クライアント
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 設定メニュー */}
            <div className="bg-white rounded-lg shadow divide-y">
              {settingsItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className="w-full p-6 text-left hover:bg-gray-50 transition-colors flex items-center gap-4"
                  >
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.label}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 出品者登録 */}
            {!hasInstructorRole && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Store className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">出品者として活動する</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      サービスを出品して収益を得ることができます。手数料10%、初期費用0円。
                    </p>
                  </div>
                  <Button
                    onClick={handleBecomeInstructor}
                    disabled={registeringInstructor}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {registeringInstructor ? '登録中...' : '出品者登録'}
                  </Button>
                </div>
              </div>
            )}

            {/* ログアウト */}
            <div className="bg-white rounded-lg shadow p-6">
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>

            {/* 退会 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">退会する</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    アカウントを削除します。未完了の予約や残高がある場合は退会できません。
                  </p>
                </div>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {deletingAccount ? '処理中...' : '退会する'}
                </Button>
              </div>
            </div>

            {/* アプリ情報 */}
            <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-500">
              <p>Coordy Version 1.0.0</p>
              <p className="mt-1">© 2024 Coordy. All rights reserved.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
