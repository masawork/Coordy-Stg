'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Button from './Button';
import { getSession } from '@/lib/auth';

// LoginModalを動的インポートしてSSRを無効化
const LoginModal = dynamic(() => import('../modals/LoginModal'), {
  ssr: false,
});

export default function Header() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState<{ user?: { user_metadata?: { role?: string } } } | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const s = await getSession();
        setSession(s);

        // ログイン済みユーザーならカート件数を取得
        if (s?.user) {
          const res = await fetch('/api/cart', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setCartCount(data.items?.length || 0);
          }
        }
      } catch {
        // セッション取得失敗は無視
      }
    };
    checkSession();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const userRole = session?.user?.user_metadata?.role?.toLowerCase();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-[100] pointer-events-auto">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>📝</span>
              <span>Coordy</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* カートアイコン（ログイン済みの場合） */}
              {session?.user && (
                <button
                  onClick={() => router.push('/user/cart')}
                  className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
                  aria-label="カート"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* ログイン済み: ダッシュボードへ / 未ログイン: ログインボタン */}
              {session?.user ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (userRole === 'instructor') router.push('/instructor');
                    else if (userRole === 'admin') router.push('/manage/admin');
                    else router.push('/user');
                  }}
                  className="relative z-[101]"
                >
                  マイページ
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenModal}
                  className="relative z-[101]"
                >
                  ログイン
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
