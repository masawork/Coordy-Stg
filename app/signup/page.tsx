'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { signUp, getSession } from '@/lib/auth';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );
        const session = await Promise.race([getSession(), timeout]) as any;
        if (session?.user) {
          if (active) window.location.href = '/user';
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

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp({ email, password, name, role: 'user' });

      const session = await getSession();
      if (session?.user) {
        window.location.href = '/user/profile/setup';
      } else {
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      const details = err.details || {};
      const originalError = details.originalError || {};
      const betterAuthError = originalError.error?.message || originalError.error || originalError.message || err.message || '';
      const lowerMsg = betterAuthError.toLowerCase();

      let msg = '登録に失敗しました。';
      if (lowerMsg.includes('email') || lowerMsg.includes('already') || lowerMsg.includes('duplicate') || lowerMsg.includes('exists') || lowerMsg.includes('unique')) {
        msg = 'このメールアドレスは既に登録されています';
      } else if (lowerMsg.includes('password') && (lowerMsg.includes('short') || lowerMsg.includes('length'))) {
        msg = 'パスワードは8文字以上で入力してください';
      } else if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
        msg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (details.status === 409) {
        msg = 'このメールアドレスは既に登録されています';
      } else if (betterAuthError) {
        msg = betterAuthError;
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">新規登録</h1>
          <p className="text-gray-600">Coordyアカウントを作成</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              お名前
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors text-gray-900 bg-white"
              placeholder="山田 太郎"
            />
          </div>

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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors text-gray-900 bg-white"
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
              minLength={8}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors text-gray-900 bg-white"
              placeholder="8文字以上"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード（確認）
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors text-gray-900 bg-white"
              placeholder="パスワードを再入力"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? '登録中...' : '新規登録'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            既にアカウントをお持ちの方は
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold ml-1">
              ログイン
            </Link>
          </p>
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          出品者として活動したい方は、登録後にダッシュボードから出品者登録ができます。
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            トップページに戻る
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
