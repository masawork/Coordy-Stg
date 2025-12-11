'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import LoginModal from '../modals/LoginModal';

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // クライアントサイドでのみモーダルを表示可能にする
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenModal = () => {
    if (mounted) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-50 pointer-events-auto">
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
            >
              ログイン
            </Button>
          </div>
        </div>
      </header>

      {mounted && (
        <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
