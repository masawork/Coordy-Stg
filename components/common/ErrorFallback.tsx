'use client';

/**
 * 共通エラーフォールバックコンポーネント
 * 各ポータルのerror.tsxから使用する
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** エラー発生元のポータル名 */
  portalName: string;
  /** 戻り先のパス */
  backPath: string;
  /** 戻り先のラベル */
  backLabel: string;
}

export default function ErrorFallback({
  error,
  reset,
  portalName,
  backPath,
  backLabel,
}: ErrorFallbackProps) {
  useEffect(() => {
    console.error(`[${portalName}] Error:`, error);
  }, [error, portalName]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
            <span className="text-2xl">⚠️</span>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-2">
            エラーが発生しました
          </h2>

          <p className="text-gray-600 text-sm">
            予期しないエラーが発生しました。もう一度お試しいただくか、ダッシュボードに戻ってください。
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg text-left">
              <p className="text-xs text-red-700 font-bold mb-1">
                {error.name}: {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-500">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            もう一度試す
          </button>

          <Link
            href={backPath}
            className="flex items-center justify-center gap-2 w-full px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
