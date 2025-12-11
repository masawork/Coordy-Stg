'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  open: boolean;
  isDesktop: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// lg breakpoint = 1024px
const DESKTOP_BREAKPOINT = 1024;

// 保護ルートかどうかを判定
const isProtectedRoute = (pathname: string) => {
  return pathname.startsWith('/user') ||
         pathname.startsWith('/instructor') ||
         pathname.startsWith('/admin') ||
         pathname.startsWith('/manage');
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();

  const toggle = () => setOpen(!open);
  const close = () => setOpen(false);

  // 初期化: ビューポート幅に応じて初期状態を設定（保護ルートのみ）
  useEffect(() => {
    const checkViewport = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      return desktop;
    };

    // 保護ルートでない場合は常にcloseを維持
    if (!isProtectedRoute(pathname)) {
      setOpen(false);
      setInitialized(true);
      return;
    }

    // 保護ルートの場合のみ、初回にデスクトップなら開く
    if (!initialized) {
      const desktop = checkViewport();
      setOpen(desktop); // デスクトップなら初期オープン
      setInitialized(true);
    }

    // リサイズ時にisDesktopを更新（openは手動変更を尊重）
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialized, pathname]);

  // モバイル時のみルート変更でサイドバーを閉じる（保護ルートの場合のみ）
  useEffect(() => {
    if (!isDesktop && isProtectedRoute(pathname)) {
      close();
    }
  }, [pathname, isDesktop]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <SidebarContext.Provider value={{ open, isDesktop, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
