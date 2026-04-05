'use client';

import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * 公開ページ（/services, /products）用の共通レイアウト
 * Header + main + Footer を提供する
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {children}
      </main>
      <Footer />
    </div>
  );
}
