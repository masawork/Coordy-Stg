import PublicLayout from '@/components/layout/PublicLayout';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
