'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  Heart,
  Activity,
  CreditCard,
  User,
  Settings,
  LogOut,
  Wallet,
  Users,
  BarChart,
  Package,
} from 'lucide-react';
import { cn, getRoleFromPath } from '@/lib/utils';
import { signOut } from 'aws-amplify/auth';
import { clearSession } from '@/lib/auth';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = getRoleFromPath(pathname);

  if (!role) return null;

  // ロール別メニュー
  const getMenuItems = () => {
    if (role === 'user') {
      // クライアント用メニュー
      return [
        {
          label: 'ホーム',
          href: `/user`,
          icon: LayoutDashboard,
        },
        {
          label: 'サービス検索',
          href: `/user/services`,
          icon: ShoppingBag,
        },
        {
          label: '自分の予定',
          href: `/user/reservations`,
          icon: Calendar,
        },
        {
          label: 'お気に入り',
          href: `/user/favorites`,
          icon: Heart,
        },
        {
          label: '活動履歴',
          href: `/user/activity`,
          icon: Activity,
        },
        {
          label: 'ポイント',
          href: `/user/wallet`,
          icon: Wallet,
        },
        {
          label: '支払い',
          href: `/user/payment`,
          icon: CreditCard,
        },
        {
          label: 'プロフィール',
          href: `/user/profile`,
          icon: User,
        },
        {
          label: '設定',
          href: `/user/settings`,
          icon: Settings,
        },
      ];
    } else if (role === 'instructor') {
      // クリエイター用メニュー
      return [
        {
          label: 'ホーム',
          href: `/instructor`,
          icon: LayoutDashboard,
        },
        {
          label: 'サービス管理',
          href: `/instructor/services`,
          icon: Package,
        },
        {
          label: '予約管理',
          href: `/instructor/reservations`,
          icon: Calendar,
        },
        {
          label: 'スケジュール',
          href: `/instructor/schedule`,
          icon: Calendar,
        },
        {
          label: 'プロフィール',
          href: `/instructor/profile`,
          icon: User,
        },
        {
          label: '設定',
          href: `/instructor/settings`,
          icon: Settings,
        },
      ];
    } else if (role === 'admin') {
      // 管理者用メニュー（/manage/admin 配下）
      return [
        {
          label: 'ホーム',
          href: `/manage/admin`,
          icon: LayoutDashboard,
        },
        {
          label: 'ダッシュボード',
          href: `/manage/admin/dashboard`,
          icon: BarChart,
        },
        {
          label: 'ユーザー管理',
          href: `/manage/admin/users`,
          icon: Users,
        },
        {
          label: 'サービス管理',
          href: `/manage/admin/services`,
          icon: Package,
        },
        {
          label: '銀行振込承認',
          href: `/manage/admin/pending-charges`,
          icon: CreditCard,
        },
        {
          label: '設定',
          href: `/manage/admin/settings`,
          icon: Settings,
        },
      ];
    }
    return [];
  };

  const menuItems = getMenuItems();

  const roleLabels = {
    user: 'クライアント',
    instructor: 'クリエイター',
    admin: '管理者',
  };

  const handleLogout = async () => {
    try {
      await signOut();
      clearSession();
      onNavigate?.();
      router.push('/');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {roleLabels[role]}メニュー
        </h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
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
                      ? role === 'user'
                        ? "bg-purple-50 text-purple-700 font-medium border border-purple-200"
                        : role === 'instructor'
                        ? "bg-green-50 text-green-700 font-medium border border-green-200"
                        : "bg-orange-50 text-orange-700 font-medium border border-orange-200"
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </nav>
  );
}
