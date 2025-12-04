/**
 * 管理者保護ルートのレイアウト
 * 認証チェックとレイアウトを提供
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, hasRole } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';

export default function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const session = getSession();

      if (!session) {
        // 未ログインの場合はログインページへ
        router.push('/login/user');
        return;
      }

      if (!hasRole('admin')) {
        // ロールが異なる場合は適切なページへ
        if (hasRole('user')) {
          router.push('/user');
        } else if (hasRole('instructor')) {
          router.push('/instructor');
        } else {
          router.push('/login/user');
        }
        return;
      }

      setUser(session);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {/* AppHeader */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <AppHeader userName={user.name} />
      </div>

      {/* メインコンテンツ */}
      <div className="pt-14 min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </>
  );
}
