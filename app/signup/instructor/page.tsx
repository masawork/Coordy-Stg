'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { signUp, getSession } from '@/lib/auth';

export default function SignupInstructorPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // マウント時に既にログイン済みかチェック
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        // タイムアウトを設定（5秒）
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 5000);
        });

        const session = await Promise.race([
          getSession(),
          timeoutPromise,
        ]) as any;

        if (session?.user) {
          const user = session.user;
          if (user.user_metadata?.role?.toLowerCase() === 'instructor') {
            if (active) {
              window.location.href = '/instructor';
            }
            return;
          }
        }
        if (active) setChecking(false);
      } catch (error) {
        console.error('Session check error:', error);
        // エラーが発生してもフォームを表示（未ログイン状態として扱う）
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

    // バリデーション
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
      // Supabase Authでサインアップ
      await signUp({
        email,
        password,
        name,
        role: 'instructor',
      });

      // サインアップ成功後、メール認証が必要な場合は確認ページへ
      const session = await getSession();
      if (session?.user) {
        console.log('✅ インストラクター登録成功、ログイン済み');
        window.location.href = '/instructor';
      } else {
        // メール認証が必要な場合
        console.log('✅ インストラクター登録成功、メール認証が必要です');
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      console.error('Error details:', err.details);
      console.error('Error message:', err.message);
      console.error('Full error object:', JSON.stringify(err, null, 2));
      
      // エラーメッセージを日本語化
      let friendlyMessage = '登録に失敗しました。';
      let errorDetails = '';
      
      // エラーの詳細情報を取得
      const details = err.details || {};
      const errorMessage = err.message || '';
      const status = details.status;
      const originalError = details.originalError || {};
      
      // Supabase Authのエラーメッセージを取得（複数の形式に対応）
      const betterAuthError = originalError.error?.message || originalError.error || originalError.message || errorMessage;
      
      // エラーの種類に応じたメッセージを設定
      const lowerMessage = betterAuthError.toLowerCase();
      
      if (lowerMessage.includes('email') || lowerMessage.includes('already') || lowerMessage.includes('duplicate') || lowerMessage.includes('exists') || lowerMessage.includes('unique')) {
        friendlyMessage = 'このメールアドレスは既に登録されています';
      } else if (lowerMessage.includes('password') || lowerMessage.includes('password')) {
        friendlyMessage = 'パスワードの形式が正しくありません';
        if (lowerMessage.includes('short') || lowerMessage.includes('length') || lowerMessage.includes('minimum')) {
          friendlyMessage = 'パスワードは8文字以上で入力してください';
        }
      } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
        friendlyMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
        friendlyMessage = '入力内容に誤りがあります。';
        errorDetails = betterAuthError;
      } else if (status === 400) {
        friendlyMessage = '入力内容に誤りがあります。';
        errorDetails = betterAuthError || `HTTP ${status}`;
      } else if (status === 409) {
        friendlyMessage = 'このメールアドレスは既に登録されています';
      } else if (status === 500) {
        friendlyMessage = 'サーバーエラーが発生しました。時間をおいて再度お試しください。';
        errorDetails = process.env.NODE_ENV === 'development' ? betterAuthError : '';
      } else if (betterAuthError && betterAuthError !== '登録に失敗しました') {
        friendlyMessage = betterAuthError;
      } else if (errorMessage && errorMessage !== '登録に失敗しました') {
        friendlyMessage = errorMessage;
      } else {
        friendlyMessage = `登録に失敗しました。${status ? `(エラーコード: ${status})` : ''}`;
      }
      
      // 詳細情報を追加（開発環境または詳細がある場合）
      if (errorDetails) {
        friendlyMessage += `\n\n原因: ${errorDetails}`;
      } else if (process.env.NODE_ENV === 'development' && betterAuthError && betterAuthError !== friendlyMessage) {
        friendlyMessage += `\n\n詳細: ${betterAuthError}`;
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // セッションチェック中はローディング表示
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">インストラクター新規登録</h1>
          <p className="text-gray-600">サービスを提供する方の登録</p>
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-colors text-gray-900 bg-white"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-colors text-gray-900 bg-white"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-colors text-gray-900 bg-white"
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-colors text-gray-900 bg-white"
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
            <Link href="/login/instructor" className="text-green-600 hover:text-green-700 font-semibold ml-1">
              ログイン
            </Link>
          </p>
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
