/**
 * グローバルローディングUI
 * Next.js 16で推奨
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="h-4 w-4 bg-white rounded-full"></div>
          </div>
        </div>
        
        <p className="mt-6 text-white text-lg font-semibold">
          読み込み中...
        </p>
      </div>
    </div>
  );
}

