'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, clearSession } from '@/lib/auth';
import { getClientProfile, updateClientProfile } from '@/lib/api/profile';
import { signOut } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { User, Bell, Shield, CreditCard, HelpCircle, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login/user');
      return;
    }

    loadProfile(session.userId);
  }, [router]);

  const loadProfile = async (userId: string) => {
    try {
      setLoading(true);
      const profileData = await getClientProfile(userId);
      setProfile(profileData);
    } catch (err) {
      console.error('プロフィール取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) {
      return;
    }

    try {
      await signOut();
      clearSession();
      router.push('/login/user');
    } catch (error) {
      console.error('ログアウトエラー:', error);
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
                    <span className="font-medium">{getSession()?.email}</span>
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
