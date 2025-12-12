'use client';

import { Settings, Bell, Shield, Database } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="mt-1 text-gray-600">システム全体の設定を管理します</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
          </div>
          <p className="text-gray-600 text-sm">
            システム通知やメール配信の設定を管理します
          </p>
          <button className="mt-4 text-orange-600 hover:text-orange-700 text-sm font-medium">
            設定を編集 →
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">セキュリティ</h2>
          </div>
          <p className="text-gray-600 text-sm">
            認証設定やアクセス制御を管理します
          </p>
          <button className="mt-4 text-orange-600 hover:text-orange-700 text-sm font-medium">
            設定を編集 →
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">データ管理</h2>
          </div>
          <p className="text-gray-600 text-sm">
            バックアップやデータエクスポートを管理します
          </p>
          <button className="mt-4 text-orange-600 hover:text-orange-700 text-sm font-medium">
            設定を編集 →
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-6 w-6 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">全般設定</h2>
          </div>
          <p className="text-gray-600 text-sm">
            サイト名やロゴなどの基本設定を管理します
          </p>
          <button className="mt-4 text-orange-600 hover:text-orange-700 text-sm font-medium">
            設定を編集 →
          </button>
        </div>
      </div>
    </div>
  );
}
