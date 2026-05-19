'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, LogOut, User, Home, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from './SidebarProvider';
import { getRoleFromPath } from '@/lib/utils';
import { signOut as betterAuthSignOut } from '@/lib/auth';
import { getSession, clearSession } from '@/lib/auth';
import { useEffect, useState } from 'react';

interface AppHeaderProps {
  userName?: string;
}

type AvailableRole = 'user' | 'instructor';

export function AppHeader({ userName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [balance, setBalance] = useState<number | null>(null);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);

  const role = getRoleFromPath(pathname);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (!session?.user) return;

      // ウォレット残高取得（ユーザーのみ）
      if (role === 'user') {
        try {
          const response = await fetch(`/api/wallet/me?role=${role}`, {
            credentials: 'include',
          });
          if (response.ok) {
            const wallet = await response.json();
            setBalance(wallet?.balance || 0);
          }
        } catch {
          // ignore
        }
      }

      // 利用可能なロールをチェック（admin以外）
      if (role && role !== 'admin') {
        const rolesToCheck: AvailableRole[] = ['user', 'instructor'];
        const available: AvailableRole[] = [];

        await Promise.all(
          rolesToCheck.map(async (r) => {
            try {
              const res = await fetch(`/api/auth/check-role?role=${r}`, {
                credentials: 'include',
              });
              if (res.ok) {
                const data = await res.json();
                if (data.user) {
                  available.push(r);
                }
              }
            } catch {
              // ignore
            }
          })
        );

        setAvailableRoles(available);
      }
    };

    loadData();
  }, [pathname, role]);

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
    } catch {
      // ignore
    }
  };

  const handleSwitchRole = (targetRole: AvailableRole) => {
    if (targetRole === role) return;
    router.push(`/${targetRole}`);
  };

  const roleLabels: Record<string, string> = {
    user: 'クライアント',
    instructor: '出品者',
    admin: '管理者',
  };

  const roleColors: Record<string, { active: string; inactive: string }> = {
    user: {
      active: 'bg-purple-600 text-white',
      inactive: 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700',
    },
    instructor: {
      active: 'bg-green-600 text-white',
      inactive: 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700',
    },
  };

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

        {/* Center: Brand + User Info + Role Switcher */}
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

          {userName && role && (
            <span className="hidden sm:inline text-sm text-gray-600">
              {userName}さん
              <span className="ml-1 text-xs text-gray-400">
                （{roleLabels[role]}ログイン中）
              </span>
            </span>
          )}

          {/* ロール切替ボタン（admin以外、両方のロールがある場合） */}
          {role !== 'admin' && availableRoles.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 ml-2">
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    r === role
                      ? roleColors[r].active
                      : roleColors[r].inactive
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Balance + Logout + Profile */}
        <div className="flex items-center gap-2">
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

      {/* モバイル: ロール切替 + ログイン中表示 */}
      {role && role !== 'admin' && (
        <div className="sm:hidden flex items-center justify-center gap-2 pb-1 -mt-1">
          {userName && (
            <span className="text-xs text-gray-400">
              {roleLabels[role]}ログイン中
            </span>
          )}
          {availableRoles.length > 1 && (
            <div className="flex items-center gap-1">
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => handleSwitchRole(r)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                    r === role
                      ? roleColors[r].active
                      : roleColors[r].inactive
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
