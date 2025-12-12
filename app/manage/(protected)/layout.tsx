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
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { X } from 'lucide-react';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { open, isDesktop, close } = useSidebar();

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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <AppHeader userName={user.name} />

      <div className="flex">
        {/* サイドバー - デスクトップ: 固定表示でメインが縮む / モバイル: オーバーレイ */}
        {open && (
          <>
            {/* Overlay - モバイル時のみ表示 */}
            {!isDesktop && (
              <div
                className="fixed inset-x-0 top-14 bottom-0 bg-black/50 z-40"
                onClick={close}
              />
            )}

            {/* Sidebar */}
            <aside
              className={`fixed left-0 top-14 bottom-0 w-64 bg-white overflow-y-auto border-r border-gray-200 ${
                isDesktop ? 'z-30' : 'z-[45] shadow-xl'
              }`}
            >
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
              <Sidebar onNavigate={isDesktop ? undefined : close} />
            </aside>
          </>
        )}

        {/* メインコンテンツ - サイドバーが開いている時は左マージンを確保 */}
        <main
          className={`flex-1 pt-14 min-h-screen transition-all duration-300 ${
            open && isDesktop ? 'ml-64' : ''
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
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
