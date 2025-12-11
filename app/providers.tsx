'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import '../src/lib/amplifyClient';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

function ProtectedSidebarSheet() {
  const { open, close } = useSidebar();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 管理者系の画面のみグローバルシートを表示（ユーザー/インストラクターは各レイアウトで制御）
  const isAdminArea =
    pathname.startsWith('/admin') || pathname.startsWith('/manage');

  // マウント前、管理者エリア以外、または閉じている場合は何もレンダリングしない
  if (!mounted || !isAdminArea || !open) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <SheetContent side="left" className="w-80 p-0">
        <Sidebar onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProtectedSidebarSheet />
      {children}
    </SidebarProvider>
  );
}
