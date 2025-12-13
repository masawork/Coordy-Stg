'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /admin/identity-documents は /manage/admin/identity-documents に移動しました。
 */
export default function IdentityDocumentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manage/admin/identity-documents');
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
