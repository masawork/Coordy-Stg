'use client';

import ErrorFallback from '@/components/common/ErrorFallback';

export default function AdminError({
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
      portalName="管理者ポータル"
      backPath="/manage/admin"
      backLabel="管理画面へ"
    />
  );
}
