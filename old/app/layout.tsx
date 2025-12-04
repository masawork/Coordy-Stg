import './globals.css';
import type { Metadata } from 'next';
import { LayoutClient } from './layout-client';

export const metadata: Metadata = {
  title: '予約サイト',
  description: '予約管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <LayoutClient>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
