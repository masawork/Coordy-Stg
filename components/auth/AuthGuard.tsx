'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'instructor' | 'admin';
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requiredRole,
  redirectTo = '/login/user' 
}: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // BetterAuthのクライアントサイドセッション取得
        const session = await getSession();

        if (!session?.user) {
          router.push(redirectTo);
          return;
        }

        // ロールチェック
        if (requiredRole) {
          const userRole = session.user?.role?.toLowerCase();
          if (userRole !== requiredRole.toLowerCase()) {
            router.push('/');
            return;
          }
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push(redirectTo);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredRole, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

