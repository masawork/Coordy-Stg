'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">管理者ダッシュボード</h1>
        <p className="text-orange-100">システム全体の管理と監視</p>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ユーザー管理</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">売上</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">予約数</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">成長率</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
            </div>
        </div>
      </div>

      {/* 管理メニュー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Button
            onClick={() => router.push('/admin/pending-charges')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>銀行振込承認</p>
              <p className="text-sm text-gray-500 mt-1">承認待ちのチャージを確認</p>
            </div>
          </Button>

          <Button
            onClick={() => router.push('/admin/users')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>ユーザー管理</p>
              <p className="text-sm text-gray-500 mt-1">ユーザー一覧と詳細</p>
            </div>
          </Button>

          <Button
            onClick={() => router.push('/admin/services')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>サービス管理</p>
              <p className="text-sm text-gray-500 mt-1">サービスの承認・編集</p>
            </div>
          </Button>

          <Button
            onClick={() => router.push('/admin/reservations')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>予約管理</p>
              <p className="text-sm text-gray-500 mt-1">全予約の確認</p>
            </div>
          </Button>

          <Button
            onClick={() => router.push('/admin/reports')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>レポート</p>
              <p className="text-sm text-gray-500 mt-1">売上・統計データ</p>
            </div>
          </Button>

          <Button
            onClick={() => router.push('/admin/settings')}
            className="h-24 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 text-lg font-semibold"
            variant="outline"
          >
            <div className="text-center">
              <p>システム設定</p>
              <p className="text-sm text-gray-500 mt-1">全般設定と管理</p>
            </div>
        </Button>
      </div>
    </div>
  );
}
