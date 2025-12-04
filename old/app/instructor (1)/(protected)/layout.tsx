'use client';

import ClientGuard from '@/components/ClientGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ClientGuard role="instructor">{children}</ClientGuard>;
}