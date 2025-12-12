'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Button from './Button';

// LoginModalを動的インポートしてSSRを無効化
// これにより、ハイドレーションの問題を回避し、初回アクセス時もモーダルが正常に動作する
const LoginModal = dynamic(() => import('../modals/LoginModal'), {
  ssr: false,
});

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 初回アクセス時から確実にクリックイベントが動作するように、
  // mounted状態チェックを削除し、直接状態を更新する
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* z-[100]に変更して、Sheetや他のオーバーレイより確実に上に表示 */}
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-[100] pointer-events-auto">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>📝</span>
              <span>Coordy</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenModal}
              className="relative z-[101]"
            >
              ログイン
            </Button>
          </div>
        </div>
      </header>

      {/* 動的インポートにより、クライアントサイドでのみレンダリングされる */}
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
