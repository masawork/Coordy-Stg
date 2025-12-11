/**
 * 管理者保護ルートのレイアウト
 * 認証チェックとレイアウトを提供
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser, saveSession } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cognitoから最新のユーザー情報を取得
        const authUser = await getCurrentAuthUser();

        // ロールがadminであることを確認
        if (authUser.role !== 'admin') {
          router.push('/manage/login?next=/manage/admin');
          return;
        }

        // セッションを更新
        saveSession(authUser);

        setUser(authUser);
        setLoading(false);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        // 認証エラーの場合はログインページへ
        router.push('/manage/login?next=/manage/admin');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <AppHeader userName={user.name} />

      {/* メインコンテンツ */}
      <main className="pt-14 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedContent>{children}</ProtectedContent>;
}
