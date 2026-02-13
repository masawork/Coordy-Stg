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
  const router = useRouter();
  const pathname = usePathname();
  const { open, isDesktop, close } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
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
              // 500エラーの場合はセットアップページへ（無限ループを防ぐ）
              if (response.status === 500) {
                console.error('🚫 Layout: Server error in check-role API, redirecting to setup');
                router.push('/user/profile/setup');
                return;
              }
              // 404エラーの場合はログインページへ
              if (response.status === 404) {
                console.log('🚫 Layout: User not registered with USER role, redirecting to login');
                router.push('/login/user');
                return;
              }
              // その他のエラーもセットアップへ
              console.error('🚫 Layout: Unexpected error in check-role API, redirecting to setup');
              router.push('/user/profile/setup');
              return;
            }

            const { user: dbUser, profile } = await response.json();
            console.log('📋 Layout: Profile check result:', {
              hasProfile: !!profile,
              isProfileComplete: profile?.isProfileComplete,
              phoneVerified: profile?.phoneVerified,
              fullName: profile?.fullName,
            });

            // プロフィールが存在しないか、完了していない場合はセットアップへ
            if (!profile || !profile.isProfileComplete) {
              console.log('🚫 Layout: Profile incomplete, redirecting to setup');
              router.push('/user/profile/setup');
              return;
            }
            setDisplayName(profile.displayName || authUser.user_metadata?.name || authUser.email || 'ユーザー');
            setUser(authUser);
          } catch (err) {
            console.error('プロフィールチェックエラー:', err);
            // エラー時はセットアップページへ（無限ループを防ぐ）
            router.push('/user/profile/setup');
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
