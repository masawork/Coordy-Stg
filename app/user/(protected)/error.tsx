'use client';

import ErrorFallback from '@/components/common/ErrorFallback';

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      portalName="ユーザーポータル"
      backPath="/user"
      backLabel="ダッシュボードへ"
    />
  );
}
