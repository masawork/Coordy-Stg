'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { registerUser, checkAuth, getCurrentAuthUser, saveSession } from '@/lib/auth';
import { isProfileComplete } from '@/lib/api/profile';
// Amplify初期化を確実に行う
import '@/src/lib/amplifyClient';

export default function SignupUserPage() {
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
        const hasAuthSession = await checkAuth();
        if (!hasAuthSession) {
          if (active) {
            console.log('✅ 未ログイン状態を確認、サインアップフォームを表示');
            setChecking(false);
          }
          return;
        }

        const authUser = await getCurrentAuthUser();
        saveSession(authUser);

        console.log('🔍 既にログイン済み:', { role: authUser.role });
        // ユーザーとしてログイン済みの場合のみリダイレクト
        // インストラクターログイン中は別途ユーザーアカウントを作成できるようにする
        if (authUser.role === 'user') {
          try {
            const profileComplete = await isProfileComplete(authUser.userId);
            window.location.href = profileComplete ? '/user' : '/user/profile/setup';
          } catch {
            window.location.href = '/user';
          }
        } else if (authUser.role === 'admin') {
          window.location.href = '/admin';
        } else if (active) {
          // インストラクターログイン中でもフォームを表示（別ロールでの登録を許可）
          setChecking(false);
        }
      } catch {
        if (active) {
          console.log('✅ 未ログイン状態を確認、サインアップフォームを表示');
          setChecking(false);
        }
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // パスワード確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setLoading(false);
      return;
    }

    // パスワード要件チェック
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      setLoading(false);
      return;
    }

    try {
      // Cognitoでユーザー登録（名前はプロフィール設定時に入力）
      const result = await registerUser({
        email,
        password,
        name: email.split('@')[0], // 仮の名前としてメールアドレスの前部分を使用
        role: 'user',
      });

      console.log('signup success', result);
      console.log('✅ ユーザー登録成功、確認コード入力画面へ');
      // 確認コード入力画面へリダイレクト
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      console.error('Signup error:', err);

      // エラーメッセージを日本語化
      let friendlyMessage = '登録に失敗しました。時間をおいて再度お試しください。';

      if (err.name === 'UsernameExistsException' || err.message?.includes('already exists')) {
        friendlyMessage = 'このメールアドレスは既に登録されています';
      } else if (err.name === 'InvalidPasswordException') {
        friendlyMessage = 'パスワードの要件を満たしていません（8文字以上、大文字・小文字・数字・記号を含む）';
      } else if (err.name === 'InvalidParameterException') {
        friendlyMessage = '入力内容に問題があります。メールアドレスとパスワードを確認してください。';
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ユーザー新規登録</h1>
          <p className="text-gray-600">サービスを予約・利用する方のアカウント作成</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              メールアドレス<span className="text-red-500">*</span>
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
              パスワード<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
              placeholder="8文字以上"
            />
            <p className="text-xs text-gray-500 mt-1">
              大文字・小文字・数字・記号を含む8文字以上
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード（確認）<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
              placeholder="パスワードを再入力"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? '登録中...' : '新規登録'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            既にアカウントをお持ちの方は
            <Link href="/login/user" className="text-purple-600 hover:text-purple-700 font-semibold ml-1">
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
