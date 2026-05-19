/**
 * インストラクター保護ルートのレイアウト（Supabase Auth）
 * 認証チェックとレイアウトを提供
 */

'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSidebar } from '@/components/layout/SidebarProvider';
import { useAuthSafe } from '@/lib/auth/AuthContext';
import { X } from 'lucide-react';

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { open, close } = useSidebar();
  const auth = useAuthSafe();
  const checkedRef = useRef(false);

  useEffect(() => {
    checkedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const checkAuth = async () => {
      try {
        const cached = auth?.getRoleData('instructor');
        if (cached && !pathname.includes('/profile/setup')) {
          const dbUser = cached.user;
          if (dbUser?.instructor?.bio) {
            setDisplayName(cached.displayName);
            setUser(cached.user);
            setLoading(false);
            auth?.fetchRoleData('instructor');
            return;
          }
        }

        const session = await getSession();

        if (!session?.user) {
          router.push('/login/instructor');
          return;
        }

        const authUser = session.user;

        if (!pathname.includes('/profile/setup')) {
          const roleData = await auth?.fetchRoleData('instructor');

          if (!roleData) {
            router.push('/login/instructor');
            return;
          }

          if (!roleData.user?.instructor?.bio) {
            router.push('/instructor/profile/setup');
            return;
          }

          setDisplayName(roleData.displayName);
          setUser(roleData.user);
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
        setLoading(false);
        router.push('/login/instructor');
      }
    };

    checkAuth();
  }, [router, pathname, auth]);

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
