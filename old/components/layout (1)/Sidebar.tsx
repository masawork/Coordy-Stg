'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Bell,
  User,
  Settings
} from 'lucide-react';
import { cn, getRoleFromPath } from '@/lib/utils';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const role = getRoleFromPath(pathname);

  if (!role) return null;

  const menuItems = [
    {
      label: 'ダッシュボード',
      href: `/${role}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: '予約',
      href: `/${role}/reservations`,
      icon: Calendar,
    },
    {
      label: 'スケジュール',
      href: `/${role}/schedules`,
      icon: CalendarDays,
    },
    {
      label: '通知',
      href: `/${role}/notifications`,
      icon: Bell,
    },
    {
      label: 'プロフィール',
      href: `/${role}/profile`,
      icon: User,
    },
    {
      label: '設定',
      href: `/${role}/settings`,
      icon: Settings,
    },
  ];

  const roleLabels = {
    user: 'ユーザー',
    instructor: 'インストラクター',
    admin: '管理者',
  };

  return (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {roleLabels[role]}メニュー
        </h2>
      </div>

      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium border border-blue-200"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-200">
        <Link
          href="/api/auth/logout"
          onClick={(e) => {
            e.preventDefault();
            fetch('/api/auth/logout', { method: 'POST' })
              .then(() => {
                window.location.href = `/${role}/login`;
              });
            onNavigate?.();
          }}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          ログアウト
        </Link>
      </div>
    </nav>
  );
}