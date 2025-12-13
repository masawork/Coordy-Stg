'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /admin/pending-charges は /manage/admin/pending-charges に移動しました。
 */
export default function PendingChargesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manage/admin/pending-charges');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  );
}
