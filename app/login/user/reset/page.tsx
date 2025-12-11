'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { confirmResetPassword } from 'aws-amplify/auth';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // バリデーション
    if (newPassword.length < 8) {
      setError('パスワードは8文字以上である必要があります。');
      setLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('パスワードには英大文字を含める必要があります。');
      setLoading(false);
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('パスワードには英小文字を含める必要があります。');
      setLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('パスワードには数字を含める必要があります。');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません。');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 パスワードリセット実行:', { email, code });

      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });

      console.log('✅ パスワードリセット成功');
      setSuccess(true);

      // 2秒後にログイン画面へ遷移
      setTimeout(() => {
        router.push('/login/user');
      }, 2000);
    } catch (err: any) {
      console.error('❌ パスワードリセットエラー:', err);

      let friendlyMessage = 'パスワードのリセットに失敗しました。';

      if (err.name === 'CodeMismatchException') {
        friendlyMessage = '確認コードが正しくありません。';
      } else if (err.name === 'ExpiredCodeException') {
        friendlyMessage = '確認コードの有効期限が切れています。もう一度リセットメールを送信してください。';
      } else if (err.name === 'InvalidPasswordException') {
        friendlyMessage = 'パスワードが要件を満たしていません。8文字以上で、大文字・小文字・数字を含めてください。';
      } else if (err.name === 'LimitExceededException') {
        friendlyMessage = 'リクエスト回数の上限に達しました。しばらく時間をおいてからお試しください。';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">新しいパスワードを設定</h1>
          <p className="text-gray-600">
            メールに届いた確認コードと新しいパスワードを入力してください。
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <label htmlFor="code" className="block text-sm font-semibold text-gray-700 mb-2">
                確認コード
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ メールに届いた6桁のコードを入力してください
              </p>
            </div>

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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
                placeholder="8文字以上（英大文字・小文字・数字を含む）"
              />
              <p className="text-xs text-gray-500 mt-1">
                ※ 8文字以上、英大文字・英小文字・数字をそれぞれ1文字以上含める
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                パスワード確認
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
              {loading ? '設定中...' : 'パスワードを設定'}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-semibold mb-2">✓ パスワードを変更しました</p>
              <p className="text-sm text-gray-600">
                新しいパスワードでログインできます。
                <br />
                自動的にログイン画面へ移動します...
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link href="/login/user/forgot" className="text-purple-600 hover:text-purple-700 font-semibold block">
            コードを再送信する
          </Link>
          <Link href="/login/user" className="text-gray-500 hover:text-gray-700 block">
            ログイン画面に戻る
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
