'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InstructorForgotRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/login/forgot'); }, [router]);
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>リダイレクト中...</p>
      </div>
    </div>
  );
}
