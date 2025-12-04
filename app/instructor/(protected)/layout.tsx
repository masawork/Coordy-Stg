/**
 * クリエイター保護ルートのレイアウト
 * 認証チェックとレイアウトを提供
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser, saveSession } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { X } from 'lucide-react';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { open, close } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Cognitoから最新のユーザー情報を取得
        const authUser = await getCurrentAuthUser();

        // ロールがinstructorであることを確認
        if (authUser.role !== 'instructor') {
          // ロールが異なる場合は適切なページへ
          if (authUser.role === 'user') {
            router.push('/user');
          } else if (authUser.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/login/instructor');
          }
          return;
        }

        // セッションを更新
        saveSession(authUser);
        setUser(authUser);
        setLoading(false);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        // 認証エラーの場合はログインページへ
        router.push('/login/instructor');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
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

      <div className="flex">
        {/* サイドバー - デスクトップ */}
        <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <Sidebar />
        </aside>

        {/* サイドバー - モバイル */}
        {open && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={close}
            />

            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 overflow-y-auto lg:hidden shadow-xl">
              {/* Close button */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">メニュー</h2>
                <button
                  onClick={close}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="閉じる"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <Sidebar onNavigate={close} />
            </aside>
          </>
        )}

        {/* メインコンテンツ */}
        <main className="flex-1 lg:ml-64 pt-14 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function InstructorProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </SidebarProvider>
  );
}
