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
  completeNewPasswordChallenge,
} from '@/lib/auth';
// Amplify初期化を確実に行う
import '@/src/lib/amplifyClient';

type LoginStep = 'login' | 'new_password';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loginStep, setLoginStep] = useState<LoginStep>('login');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // マウント時に既にログイン済みかチェック（Cognitoから最新情報を取得）
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      let redirected = false;
      try {
        const hasAuthSession = await Promise.race([
          checkAuth(),
          // Cognitoセッション取得がハングするケースに備えてタイムアウトを設ける
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000)),
        ]);

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
        if (authUser.role === 'admin') {
          // 管理者として既にログイン済みの場合のみリダイレクト
          redirected = true;
          window.location.href = '/manage/admin';
        } else if (active) {
          // user/instructorでログイン中の場合はフォームを表示（管理者として別途ログイン可能）
          console.log('📝 別ロールでログイン中、管理者ログインフォームを表示');
          setChecking(false);
        }
      } catch (error) {
        clearSession();
        if (active) {
          console.log('✅ 未ログイン状態を確認、ログインフォームを表示');
          setChecking(false);
        }
      } finally {
        if (active && !redirected) {
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
      const loginResult = await loginUser({ email, password });

      // NEW_PASSWORD_REQUIRED チャレンジの場合
      if (loginResult.nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('🔐 パスワード変更が必要です');
        setLoginStep('new_password');
        setLoading(false);
        return;
      }

      const user = loginResult.user;
      if (!user) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // ロールがadminであることを確認
      if (user.role !== 'admin') {
        throw new Error('管理者アカウントでログインしてください');
      }

      // セッションを保存
      saveSession(user);

      console.log('✅ 管理者ログイン成功、ダッシュボードへリダイレクト');
      window.location.href = '/manage/admin';
    } catch (err: any) {
      console.error('Login error:', err);

      // UserAlreadyAuthenticatedException の場合
      if (err.name === 'UserAlreadyAuthenticatedException') {
        try {
          const authUser = await getCurrentAuthUser();
          saveSession(authUser);

          if (authUser.role === 'admin') {
            router.push('/manage/admin');
          } else {
            // 別ロールでログイン中の場合、メッセージを表示
            setError('別のアカウントで既にログイン済みです。管理者としてログインするには、一度ログアウトしてから再度お試しください。');
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
        friendlyMessage = 'メール確認が完了していません';
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

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // パスワード確認チェック
    if (newPassword !== confirmNewPassword) {
      setError('新しいパスワードが一致しません');
      setLoading(false);
      return;
    }

    // パスワード強度チェック（最低8文字）
    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      setLoading(false);
      return;
    }

    try {
      const { user } = await completeNewPasswordChallenge(newPassword);

      // ロールがadminであることを確認
      if (user.role !== 'admin') {
        throw new Error('管理者アカウントでログインしてください');
      }

      // セッションを保存
      saveSession(user);

      console.log('✅ パスワード変更完了、ダッシュボードへリダイレクト');
      window.location.href = '/manage/admin';
    } catch (err: any) {
      console.error('New password error:', err);
      setError(err.message || 'パスワードの設定に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // セッションチェック中はローディング表示
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        {loginStep === 'login' ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">管理者ログイン</h1>
              <p className="text-gray-600">システム管理者専用</p>
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-600 focus:outline-none transition-colors"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-600 focus:outline-none transition-colors"
                  placeholder="パスワードを入力"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full bg-gray-800 hover:bg-gray-900" disabled={loading}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                トップページに戻る
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">パスワード変更</h1>
              <p className="text-gray-600">初回ログインのため、新しいパスワードを設定してください</p>
            </div>

            <form onSubmit={handleNewPasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-600 focus:outline-none transition-colors"
                  placeholder="8文字以上で入力"
                />
              </div>

              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-gray-600 focus:outline-none transition-colors"
                  placeholder="パスワードを再入力"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full bg-gray-800 hover:bg-gray-900" disabled={loading}>
                {loading ? '設定中...' : 'パスワードを設定'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setLoginStep('login');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ログイン画面に戻る
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
