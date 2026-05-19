'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getSession } from '@/lib/auth';

interface RoleCache {
  user: any | null;
  profile: any | null;
  displayName: string;
  checkedAt: number;
}

interface AuthContextValue {
  getRoleData: (role: 'user' | 'instructor') => RoleCache | null;
  fetchRoleData: (role: 'user' | 'instructor') => Promise<RoleCache | null>;
  prefetchRole: (role: 'user' | 'instructor') => void;
  invalidate: (role?: 'user' | 'instructor') => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Record<string, RoleCache>>({});
  const fetchingRef = useRef<Record<string, Promise<RoleCache | null>>>({});

  const getRoleData = useCallback((role: 'user' | 'instructor'): RoleCache | null => {
    const cached = cache.current[role];
    if (!cached) return null;
    if (Date.now() - cached.checkedAt > CACHE_TTL) return null;
    return cached;
  }, []);

  const fetchRoleData = useCallback(async (role: 'user' | 'instructor'): Promise<RoleCache | null> => {
    if (fetchingRef.current[role]) {
      return fetchingRef.current[role];
    }

    const promise = (async () => {
      try {
        const session = await getSession();
        if (!session?.user) return null;

        const response = await fetch(`/api/auth/check-role?role=${role}`, {
          credentials: 'include',
        });

        if (!response.ok) return null;

        const { user: dbUser, profile } = await response.json();

        const authUser = session.user;
        let displayName = '';

        if (role === 'user') {
          displayName = profile?.displayName || authUser.user_metadata?.name || authUser.email || 'ユーザー';
        } else {
          displayName = profile?.displayName || authUser.user_metadata?.name || authUser.email || 'インストラクター';
        }

        const result: RoleCache = {
          user: dbUser,
          profile,
          displayName,
          checkedAt: Date.now(),
        };

        cache.current[role] = result;
        return result;
      } catch {
        return null;
      } finally {
        delete fetchingRef.current[role];
      }
    })();

    fetchingRef.current[role] = promise;
    return promise;
  }, []);

  const prefetchRole = useCallback((role: 'user' | 'instructor') => {
    const cached = cache.current[role];
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL) return;
    fetchRoleData(role);
  }, [fetchRoleData]);

  const invalidate = useCallback((role?: 'user' | 'instructor') => {
    if (role) {
      delete cache.current[role];
    } else {
      cache.current = {};
    }
  }, []);

  return (
    <AuthContext.Provider value={{ getRoleData, fetchRoleData, prefetchRole, invalidate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthSafe() {
  return useContext(AuthContext);
}
