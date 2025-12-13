'use client';

import { CreditCard, Plus } from 'lucide-react';

export default function UserPaymentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">支払い方法</h1>
          <p className="mt-1 text-gray-600">支払い方法を管理します</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="h-4 w-4" />
          カードを追加
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">登録されている支払い方法はありません</p>
          <button className="text-purple-600 hover:text-purple-700 font-medium">
            支払い方法を追加する →
          </button>
        </div>
      </div>
    </div>
  );
}
