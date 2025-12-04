'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, LogOut, User, Home, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from './SidebarProvider';
import { getRoleFromPath } from '@/lib/utils';
import { signOut } from 'aws-amplify/auth';
import { getSession, clearSession } from '@/lib/auth';
import { getClientWallet } from '@/lib/api/wallet';
import { useEffect, useState } from 'react';

interface AppHeaderProps {
  userName?: string;
}

export function AppHeader({ userName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const loadBalance = async () => {
      const session = getSession();
      if (session) {
        try {
          const wallet = await getClientWallet(session.userId);
          setBalance(wallet?.balance || 0);
        } catch (err) {
          console.error('残高取得エラー:', err);
        }
      }
    };

    loadBalance();
  }, [pathname]);

  // Don't show header on login/signup pages
  if (/\/(login|signup|verify)/.test(pathname)) {
    return null;
  }

  const role = getRoleFromPath(pathname);

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to role homepage
      const fallbackPath = role ? `/${role}` : '/';
      router.push(fallbackPath);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 ログアウト処理開始（AppHeader）');
      // Cognitoセッションをクリア
      await signOut();
      console.log('✅ Cognitoセッション削除完了');

      // localStorageをクリア
      clearSession();
      console.log('✅ localStorage削除完了');

      // トップページにリダイレクト
      window.location.href = '/';
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
    }
  };

  const roleLabels = {
    user: 'クライアント',
    instructor: 'クリエイター',
    admin: '管理者',
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 px-4">
      <div className="flex items-center justify-between h-full">
        {/* Left: Hamburger → Back */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="メニュー"
            className="h-9 w-9"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="戻る"
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Brand + Logo */}
        <div className="flex-1 flex justify-center items-center gap-3">
          <Link
            href={role ? `/${role}` : '/'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Home className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-semibold text-gray-800 hidden sm:inline">
              Coordy
            </span>
          </Link>

          {userName && (
            <>
              <span className="hidden sm:inline text-sm text-gray-600">
                {userName}さん
              </span>
              {role && (
                <span className="hidden sm:inline px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                  {roleLabels[role]}
                </span>
              )}
            </>
          )}
        </div>

        {/* Right: Balance → Logout → Profile */}
        <div className="flex items-center gap-2">
          {/* ポイント残高 */}
          {balance !== null && role === 'user' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/user/wallet')}
              className="text-sm text-gray-600 hover:text-gray-900 hidden md:flex items-center gap-1"
            >
              <Wallet className="h-4 w-4" />
              {balance.toLocaleString()}pt
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 hidden sm:flex"
          >
            ログアウト
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="ログアウト"
            className="h-9 w-9 sm:hidden"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="プロフィール"
            className="h-9 w-9"
            onClick={() => router.push(`/${role}/profile`)}
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
