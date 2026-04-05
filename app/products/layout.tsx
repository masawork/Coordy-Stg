import PublicLayout from '@/components/layout/PublicLayout';

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
