'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, LogOut, User, Home, Wallet, RefreshCw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from './SidebarProvider';
import { getRoleFromPath } from '@/lib/utils';
import { signOut as betterAuthSignOut } from '@/lib/auth';
import { getSession, clearSession } from '@/lib/auth';
import { useEffect, useState, useRef } from 'react';

interface RoleInfo {
  role: string;
  name: string;
  isCurrent: boolean;
}

interface AppHeaderProps {
  userName?: string;
}

const roleLabels: Record<string, string> = {
  user: 'クライアント',
  instructor: 'サービス提供者',
  admin: '管理者',
};

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  user: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  instructor: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  admin: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
};

const roleHomePaths: Record<string, string> = {
  user: '/user',
  instructor: '/instructor',
  admin: '/manage/admin',
};

export function AppHeader({ userName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [balance, setBalance] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState<number>(0);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = getRoleFromPath(pathname);

  // ウォレット残高を取得
  useEffect(() => {
    const loadBalance = async () => {
      if (!role || role !== 'user') return;

      const session = await getSession();
      if (session?.user) {
        try {
          const response = await fetch(`/api/wallet/me?role=${role}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const wallet = await response.json();
            setBalance(wallet?.balance || 0);
          }
        } catch (err) {
          console.error('残高取得エラー:', err);
        }
      }
    };

    loadBalance();
  }, [pathname, role]);

  // カート件数を取得
  useEffect(() => {
    const loadCartCount = async () => {
      if (!role || role !== 'user') return;
      try {
        const response = await fetch('/api/cart', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setCartCount(data.items?.length || 0);
        }
      } catch {
        // カート未取得でもエラーにしない
      }
    };
    loadCartCount();
  }, [pathname, role]);

  // 利用可能なロール一覧を取得
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await fetch('/api/auth/available-roles', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableRoles(data.roles || []);
        }
      } catch (err) {
        console.error('ロール取得エラー:', err);
      }
    };

    loadRoles();
  }, [pathname]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleSwitcher(false);
      }
    };

    if (showRoleSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleSwitcher]);

  // ログイン/サインアップページでは非表示
  if (/\/(login|signup|verify)/.test(pathname)) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      const fallbackPath = role ? `/${role}` : '/';
      router.push(fallbackPath);
    }
  };

  const handleLogout = async () => {
    try {
      await betterAuthSignOut();
      clearSession();
      const fallbackPath = role === 'admin' ? '/manage/admin' : '/';
      window.location.href = fallbackPath;
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const handleSwitchRole = async (targetRole: string) => {
    if (targetRole === role || isSwitching) return;

    setIsSwitching(true);
    setShowRoleSwitcher(false);

    try {
      const response = await fetch('/api/auth/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: targetRole }),
      });

      if (response.ok) {
        // ロール切り替え成功 → 対象ロールのホームへ遷移
        const homePath = roleHomePaths[targetRole] || '/';
        window.location.href = homePath;
      } else {
        const data = await response.json();
        alert(data.error?.message || 'ロール切り替えに失敗しました');
        setIsSwitching(false);
      }
    } catch (error) {
      console.error('ロール切り替えエラー:', error);
      alert('ロール切り替えに失敗しました');
      setIsSwitching(false);
    }
  };

  const otherRoles = availableRoles.filter((r) => r.role !== role);
  const hasMultipleRoles = otherRoles.length > 0;
  const currentRoleColor = role ? roleColors[role] : roleColors.user;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 px-4 pointer-events-auto">
      <div className="flex items-center justify-between h-full">
        {/* Left: Hamburger + Back */}
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

        {/* Center: Brand + Role Switcher */}
        <div className="flex-1 flex justify-center items-center gap-3">
          <Link
            href={role ? roleHomePaths[role] || `/${role}` : '/'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Home className="h-5 w-5 text-purple-600" />
            <span className="text-lg font-semibold text-gray-800 hidden sm:inline">
              Coordy
            </span>
          </Link>

          {userName && (
            <span className="hidden sm:inline text-sm text-gray-600">
              {userName}さん
            </span>
          )}

          {/* ロールバッジ / 切り替えボタン */}
          {role && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => hasMultipleRoles && setShowRoleSwitcher(!showRoleSwitcher)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                  ${currentRoleColor.bg} ${currentRoleColor.text}
                  ${hasMultipleRoles ? `cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-${currentRoleColor.border} transition-all` : ''}
                `}
                disabled={!hasMultipleRoles || isSwitching}
                title={hasMultipleRoles ? 'クリックでロール切り替え' : undefined}
              >
                {isSwitching ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : null}
                {roleLabels[role] || role}
                {hasMultipleRoles && !isSwitching && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* ロール切り替えドロップダウン */}
              {showRoleSwitcher && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[60]">
                  <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                    ロールを切り替え
                  </div>
                  {otherRoles.map((r) => {
                    const colors = roleColors[r.role] || roleColors.user;
                    return (
                      <button
                        key={r.role}
                        onClick={() => handleSwitchRole(r.role)}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <span className={`inline-block w-2 h-2 rounded-full ${colors.bg} ring-2 ${colors.border}`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {roleLabels[r.role] || r.role}
                          </div>
                          <div className="text-xs text-gray-500">
                            {roleHomePaths[r.role]} へ移動
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Balance + Logout + Profile */}
        <div className="flex items-center gap-2">
          {role === 'user' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/user/cart')}
              aria-label="カート"
              className="h-9 w-9 relative"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Button>
          )}

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
