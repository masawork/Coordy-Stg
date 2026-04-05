/**
 * クライアント保護ルートのレイアウト（Supabase Auth）
 * 認証チェックとレイアウトを提供
 */

'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { X } from 'lucide-react';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { open, isDesktop, close } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthError(null);
        const session = await getSession();

        if (!session?.user) {
          router.push('/login/user');
          return;
        }

        const authUser = session.user;

        // プロフィール完了チェック（セットアップページ以外）
        if (!pathname.includes('/profile/setup')) {
          try {
            // ロール別にプロフィールを取得（USERロールのユーザーを検索）
            const response = await fetch(`/api/auth/check-role?role=user`, {
              credentials: 'include',
            });

            if (!response.ok) {
              // 404エラーの場合はログインページへ（USERロール未登録）
              if (response.status === 404) {
                router.push('/login/user');
                return;
              }
              // 401エラーの場合はログインページへ
              if (response.status === 401) {
                router.push('/login/user');
                return;
              }
              // 500やその他のサーバーエラーの場合はエラー表示（無限リダイレクト防止）
              console.error('Layout: check-role API error:', response.status);
              setLoading(false);
              setAuthError('サーバーとの通信でエラーが発生しました。しばらくしてから再度お試しください。');
              return;
            }

            const data = await response.json();
            const profile = data.profile;

            // プロフィールが存在しないか、完了していない場合はセットアップへ
            if (!profile || !profile.isProfileComplete) {
              router.push('/user/profile/setup');
              return;
            }
            setDisplayName(profile.displayName || authUser.user_metadata?.name || authUser.email || 'ユーザー');
            setUser(authUser);
          } catch (err) {
            console.error('プロフィールチェックエラー:', err);
            // ネットワークエラー等はエラー表示（無限リダイレクト防止）
            setLoading(false);
            setAuthError('ネットワークエラーが発生しました。接続を確認して再度お試しください。');
            return;
          }
        } else {
          setDisplayName(authUser.user_metadata?.name || authUser.email || 'ユーザー');
          setUser(authUser);
        }

        setLoading(false);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        setLoading(false);
        router.push('/login/user');
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-6">{authError}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                再読み込み
              </button>
              <button
                onClick={() => router.push('/login/user')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                ログインページへ
              </button>
            </div>
          </div>
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
      <AppHeader userName={displayName} />

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

export default function UserProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedContent>{children}</ProtectedContent>;
}
