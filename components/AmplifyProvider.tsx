'use client';

import { useEffect } from 'react';
import { configureAmplify } from '@/lib/amplify-config';

/**
 * Amplify設定プロバイダー
 * 
 * クライアント側でAmplify設定を初期化
 */
export default function AmplifyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    configureAmplify();
  }, []);

  return <>{children}</>;
}
