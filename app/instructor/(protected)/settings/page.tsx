'use client';

import { useState } from 'react';
import { Bell, Lock, Shield, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstructorSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    reservationReminder: true,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-sm text-gray-600 mt-1">アカウントと通知の設定を管理します</p>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">メール通知</p>
              <p className="text-sm text-gray-500">予約やメッセージをメールで受け取る</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">プッシュ通知</p>
              <p className="text-sm text-gray-500">ブラウザでプッシュ通知を受け取る</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">予約リマインダー</p>
              <p className="text-sm text-gray-500">予約の前日にリマインダーを送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.reservationReminder}
                onChange={(e) => setNotifications({ ...notifications, reservationReminder: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* セキュリティ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">セキュリティ</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">パスワード変更</p>
              <p className="text-sm text-gray-500">アカウントのパスワードを変更します</p>
            </div>
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              変更
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">二段階認証</p>
              <p className="text-sm text-gray-500">セキュリティを強化するための追加認証</p>
            </div>
            <Button variant="outline" size="sm">
              設定
            </Button>
          </div>
        </div>
      </div>

      {/* 支払い設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">支払い設定</h2>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">振込先口座</p>
              <p className="text-sm text-gray-500">報酬の振込先銀行口座を設定します</p>
            </div>
            <Button variant="outline" size="sm">
              設定
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
