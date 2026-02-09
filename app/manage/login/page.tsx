'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { signIn, getSession } from '@/lib/auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // マウント時に既にログイン済みかチェック
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const user = session.user;
          // ロールがadminであることを確認
          if (user.user_metadata?.role?.toLowerCase() === 'admin') {
            if (active) {
              window.location.href = '/manage/admin';
            }
            return;
          }
        }
        if (active) setChecking(false);
      } catch (error) {
        console.error('Session check error:', error);
        if (active) setChecking(false);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      // Supabase Authでログイン
      await signIn({ email, password });

      // セッションを取得してユーザー情報を確認
      const session = await getSession();
      if (!session?.user) {
        throw new Error('ログインに失敗しました');
      }

      const user = session.user;

      // ロールがadminであることを確認
      if (user.user_metadata?.role?.toLowerCase() !== 'admin') {
        throw new Error('管理者アカウントでログインしてください');
      }

      console.log('✅ 管理者ログイン成功');
      window.location.href = '/manage/admin';
    } catch (err: any) {
      console.error('Login error:', err);

      // エラーメッセージを日本語化
      let friendlyMessage = 'ログインに失敗しました。時間をおいて再度お試しください。';

      if (err.message?.includes('email') || err.message?.includes('password')) {
        friendlyMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (err.message?.includes('not found') || err.message?.includes('登録')) {
        friendlyMessage = 'このメールアドレスは登録されていません';
      } else if (err.message?.includes('network') || err.message?.includes('Network')) {
        friendlyMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // セッションチェック中はローディング表示
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-500 to-pink-400 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-500 to-pink-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">管理者ログイン</h1>
          <p className="text-gray-600">システム管理者のログイン</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-600 focus:outline-none transition-colors"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-600 focus:outline-none transition-colors"
                  placeholder="パスワードを入力"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>

        <div className="mt-4 text-center">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                トップページに戻る
              </Link>
            </div>
      </motion.div>
    </div>
  );
}
