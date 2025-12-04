'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Menu, LogOut, User, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from './SidebarProvider';
import { getRoleFromPath } from '@/lib/utils';

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toggle } = useSidebar();

  // Don't show header on login pages
  if (/\/[^/]+\/login$/.test(pathname)) {
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

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        window.location.href = `/${role}/login`;
      });
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
        <div className="flex-1 flex justify-center">
          <Link
            href={role ? `/${role}` : '/'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Home className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-semibold text-gray-800 hidden sm:inline">
              予約サイト
            </span>
          </Link>
        </div>

        {/* Right: Logout → Profile */}
        <div className="flex items-center gap-2">
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
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}