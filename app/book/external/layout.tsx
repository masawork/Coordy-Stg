import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '予約 | Coordy',
  description: '外部連携による予約ページ',
};

export default function ExternalBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
