'use client';

/**
 * 404 Not Found ページ
 * Next.js 16で必須
 */

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            404
          </h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ページが見つかりません
          </h2>
          <p className="text-gray-600">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Home className="w-5 h-5" />
            トップページへ
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            前のページに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

