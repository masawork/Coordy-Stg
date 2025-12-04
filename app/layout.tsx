'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import "../src/lib/amplifyClient";
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const inter = Inter({ subsets: ["latin"] });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { open, close } = useSidebar();

  return (
    <>
      {/* サイドバーシート（保護ルート内でのみ使用） */}
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && close()}>
        <SheetContent side="left" className="w-80 p-0">
          <Sidebar onNavigate={close} />
        </SheetContent>
      </Sheet>

      {/* メインコンテンツ（ヘッダーはルートレイアウトでは表示しない） */}
      <main>
        {children}
      </main>
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SidebarProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </SidebarProvider>
      </body>
    </html>
  );
}
