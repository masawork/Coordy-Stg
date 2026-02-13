/**
 * 管理者レイアウト（Supabase Auth）
 * 親のmanage/(protected)/layoutで既に認証チェック済み
 */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
