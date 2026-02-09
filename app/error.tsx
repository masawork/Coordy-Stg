'use client';

/**
 * グローバルエラーページ
 * Next.js 16で推奨
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw } from 'lucide-react';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            エラーが発生しました
          </h1>
          
          <p className="text-gray-600 mb-2">
            申し訳ございません。予期しないエラーが発生しました。
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg text-left">
              <p className="text-xs text-red-600 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-5 h-5" />
            もう一度試す
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-5 h-5" />
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
}

