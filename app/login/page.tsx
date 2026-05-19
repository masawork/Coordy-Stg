'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { signIn, getSession, signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const dest = await detectRedirect(session.user.id);
          if (active) window.location.href = dest;
          return;
        }
        if (active) setChecking(false);
      } catch {
        if (active) setChecking(false);
      }
    };
    checkSession();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      await signIn({ email, password });

      const session = await getSession();
      if (!session?.user) throw new Error('ログインに失敗しました');

      const dest = await detectRedirect(session.user.id);
      window.location.href = dest;
    } catch (err: any) {
      let msg = 'ログインに失敗しました。時間をおいて再度お試しください。';
      if (err.message?.includes('email') || err.message?.includes('password')) {
        msg = 'メールアドレスまたはパスワードが正しくありません';
      } else if (err.message?.includes('not found')) {
        msg = 'このメールアドレスは登録されていません';
      } else if (err.message?.includes('network') || err.message?.includes('Network')) {
        msg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ログイン</h1>
          <p className="text-gray-600">Coordyにログインしてサービスを利用</p>
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
              placeholder="your@email.com"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
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
          <Link href="/login/forgot" className="text-sm text-purple-600 hover:text-purple-700">
            パスワードをお忘れの方はこちら
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            アカウントをお持ちでない方は
            <Link href="/signup" className="text-purple-600 hover:text-purple-700 font-semibold ml-1">
              新規登録
            </Link>
          </p>
        </div>

        <div className="mt-6">
          <button
            onClick={() => signInWithGoogle('user')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 hover:border-purple-600 transition-colors"
          >
            <span className="text-lg">G</span>
            <span className="font-semibold">Googleでログイン</span>
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            トップページに戻る
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

async function detectRedirect(_authUserId: string): Promise<string> {
  try {
    const [userRes, instrRes] = await Promise.all([
      fetch('/api/auth/check-role?role=USER'),
      fetch('/api/auth/check-role?role=INSTRUCTOR'),
    ]);
    const userData = userRes.ok ? await userRes.json() : null;
    const instrData = instrRes.ok ? await instrRes.json() : null;

    if (userData?.user) return '/user';
    if (instrData?.user) return '/instructor';

    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    });
    return '/user/profile/setup';
  } catch {
    return '/user/profile/setup';
  }
}
