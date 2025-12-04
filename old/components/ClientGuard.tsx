'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fakeApi } from '@/lib/fakeApi';
import { type Role } from '@/lib/mock';

interface ClientGuardProps {
  role: Role;
  children: React.ReactNode;
}

export default function ClientGuard({ role, children }: ClientGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const auth = fakeApi.getCurrentAuth();
      
      // 未ログイン
      if (!auth) {
        router.replace(`/${role}/login`);
        return;
      }
      
      // ロール不一致
      if (auth.role !== role) {
        router.replace(`/${role}/login`);
        return;
      }
      
      // 認証OK
      setIsChecking(false);
    };

    checkAuth();
  }, [role, router]);

  // 判定中は何も表示しない
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}