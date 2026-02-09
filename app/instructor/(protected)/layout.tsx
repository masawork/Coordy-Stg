/**
 * インストラクター保護ルートのレイアウト（Supabase Auth）
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
  const [redirected, setRedirected] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { open, close } = useSidebar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();

        if (!session?.user) {
          if (!redirected) {
            setRedirected(true);
            router.push('/login/instructor');
          }
          return;
        }

        const authUser = session.user;

        // インストラクタープロフィールチェック（セットアップページ以外）
        if (!pathname.includes('/profile/setup')) {
          try {
            // ロール別にユーザーを検索（INSTRUCTORロール）
            const response = await fetch(`/api/auth/check-role?role=instructor`, {
              credentials: 'include',
            });

            if (!response.ok) {
              // このロールでユーザーが登録されていない
              if (!redirected) {
                setRedirected(true);
                router.push('/login/instructor');
              }
              return;
            }

            const { user: dbUser, profile } = await response.json();

            // インストラクターのセットアップが完了しているか確認（bioが設定されているか）
            if (!dbUser.instructor || !dbUser.instructor.bio) {
              if (!redirected) {
                setRedirected(true);
                router.push('/instructor/profile/setup');
              }
              return;
            }

            setDisplayName(
              profile?.displayName
                || authUser.user_metadata?.name
                || authUser.email
                || 'インストラクター'
            );
            setUser(authUser);
          } catch (err) {
            console.error('インストラクタープロフィール取得エラー:', err);
            if (!redirected) {
              setRedirected(true);
              router.push('/instructor/profile/setup');
            }
            return;
          }
        } else {
          setDisplayName(
            authUser.user_metadata?.name
              || authUser.email
              || 'インストラクター'
          );
          setUser(authUser);
        }

        setLoading(false);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        setLoading(false);
        if (!redirected) {
          setRedirected(true);
          router.push('/login/instructor');
        }
      }
    };

    checkAuth();
  }, [router, pathname, redirected]);

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
      <AppHeader userName={displayName} />

      <div className="flex">
        {/* サイドバー */}
        {open && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-x-0 top-14 bottom-0 bg-black/50 z-40 md:hidden"
              onClick={close}
            />

            {/* Sidebar */}
            <aside className="fixed left-0 top-14 bottom-0 w-64 bg-white overflow-y-auto border-r border-gray-200 z-[45] shadow-xl md:z-30">
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
        <main className="flex-1 pt-14 min-h-screen">
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
  return <ProtectedContent>{children}</ProtectedContent>;
}
