'use client';

import { usePathname } from 'next/navigation';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import { Sidebar } from '@/components/layout/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, close } = useSidebar();

  // Check if we should show the header
  // Exclude: login pages and /user pages that use ReservationWireframe (which has its own header)
  const showHeader = !/\/[^/]+\/login$/.test(pathname) &&
    !(pathname === '/user' ||
      (pathname.startsWith('/user/') && pathname !== '/user/dashboard'));

  return (
    <>
      {showHeader && <AppHeader />}

      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && close()}>
        <SheetContent side="left" className="w-80 p-0">
          <Sidebar onNavigate={close} />
        </SheetContent>
      </Sheet>

      <main className={showHeader ? 'pt-14' : ''}>
        {children}
      </main>
    </>
  );
}

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}