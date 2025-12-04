'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import {
  loginUser,
  saveSession,
  clearSession,
  checkAuth,
  getCurrentAuthUser,
} from '@/lib/auth';
import { isProfileComplete } from '@/lib/api/profile';

export default function UserLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // マウント時に既にログイン済みかチェック（Cognitoから最新情報を取得）
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const hasAuthSession = await checkAuth();
        if (!hasAuthSession) {
          clearSession();
          if (active) {
            console.log('✅ 未ログイン状態を確認、ログインフォームを表示');
            setChecking(false);
          }
          return;
        }

        const authUser = await getCurrentAuthUser();
        saveSession(authUser);

        console.log('🔍 既にログイン済み:', { role: authUser.role });
        if (authUser.role === 'user') {
          try {
            const profileComplete = await isProfileComplete(authUser.userId);
            window.location.href = profileComplete ? '/user' : '/user/profile/setup';
          } catch (err) {
            console.error('プロフィールチェックエラー:', err);
            window.location.href = '/user';
          }
        } else if (authUser.role === 'instructor') {
          window.location.href = '/instructor';
        } else if (authUser.role === 'admin') {
          window.location.href = '/admin';
        } else if (active) {
          setChecking(false);
        }
      } catch (error) {
        clearSession();
        if (active) {
          console.log('✅ 未ログイン状態を確認、ログインフォームを表示');
          setChecking(false);
        }
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 古いセッションをクリア（別アカウントでのログインをサポート）
      clearSession();

      // Cognitoでログイン
      const { user } = await loginUser({ email, password });

      // ロールがuserであることを確認
      if (user.role !== 'user') {
        throw new Error('クライアントアカウントでログインしてください');
      }

      // セッションを保存
      saveSession(user);

      console.log('✅ ユーザーログイン成功、プロフィールチェック中...');
      // プロフィール完了状態をチェックしてリダイレクト
      try {
        const profileComplete = await isProfileComplete(user.userId);
        console.log('🔍 プロフィール完了チェック結果:', profileComplete);
        if (profileComplete) {
          console.log('✅ プロフィール完了、/user にリダイレクト');
          window.location.href = '/user';
        } else {
          console.log('⚠️ プロフィール未完了、/user/profile/setup にリダイレクト');
          window.location.href = '/user/profile/setup';
        }
      } catch (err) {
        console.error('❌ プロフィールチェックエラー:', err);
        // エラー時はダッシュボードへ（保護レイアウトで再チェックされる）
        window.location.href = '/user';
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // UserAlreadyAuthenticatedException の場合は成功扱い
      if (err.name === 'UserAlreadyAuthenticatedException') {
        try {
          const authUser = await getCurrentAuthUser();
          saveSession(authUser);

          if (authUser.role === 'user') {
            try {
              const profileComplete = await isProfileComplete(authUser.userId);
              router.push(profileComplete ? '/user' : '/user/profile/setup');
            } catch {
              router.push('/user');
            }
          } else if (authUser.role === 'instructor') {
            router.push('/instructor');
          } else if (authUser.role === 'admin') {
            router.push('/admin');
          } else {
            setError('別のアカウントで既にログイン済みです。一度ログアウトしてから再度お試しください。');
          }
        } catch {
          setError('既にログイン済みです。ページをリロードしてください。');
        }
        setLoading(false);
        return;
      }

      // エラーメッセージを日本語化
      let friendlyMessage = 'ログインに失敗しました';

      if (err.name === 'UserNotConfirmedException') {
        // 未確認ユーザーの場合
        setError('メール確認が完了していません。確認コード入力画面へ移動します...');
        setTimeout(() => {
          router.push(`/verify?email=${encodeURIComponent(email)}`);
        }, 2000);
        setLoading(false);
        return;
      } else if (err.name === 'NotAuthorizedException') {
        friendlyMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (err.name === 'UserNotFoundException') {
        friendlyMessage = 'このメールアドレスは登録されていません';
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">クライアントログイン</h1>
          <p className="text-gray-600">学びたい方のログイン</p>
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
              {error.includes('メール確認が完了していません') && (
                <Link
                  href={`/verify?email=${encodeURIComponent(email)}`}
                  className="text-purple-600 hover:text-purple-700 font-semibold text-sm mt-2 inline-block"
                >
                  → 確認コード入力画面へ
                </Link>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login/user/forgot" className="text-sm text-purple-600 hover:text-purple-700">
            パスワードをお忘れの方はこちら
          </Link>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            アカウントをお持ちでない方は
            <Link href="/signup/user" className="text-purple-600 hover:text-purple-700 font-semibold ml-1">
              新規登録
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
