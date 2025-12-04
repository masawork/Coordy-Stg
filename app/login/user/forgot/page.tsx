'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { resetPassword } from 'aws-amplify/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('📤 パスワードリセットメール送信:', email);

      await resetPassword({
        username: email,
      });

      console.log('✅ パスワードリセットメール送信成功');
      setSuccess(true);

      // 2秒後にリセットコード入力画面へ遷移
      setTimeout(() => {
        router.push(`/login/user/reset?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: any) {
      console.error('❌ パスワードリセットエラー:', err);

      let friendlyMessage = 'リセットメールの送信に失敗しました。';

      if (err.name === 'UserNotFoundException') {
        friendlyMessage = 'このメールアドレスは登録されていません。';
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">パスワードをお忘れですか？</h1>
          <p className="text-gray-600">
            登録されているメールアドレスを入力してください。
            <br />
            パスワードリセット用のコードをお送りします。
          </p>
        </div>

        {!success ? (
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

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? '送信中...' : 'リセットメールを送信'}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-semibold mb-2">✓ メールを送信しました</p>
              <p className="text-sm text-gray-600">
                {email} にパスワードリセット用の確認コードを送信しました。
                <br />
                メールを確認してください。
              </p>
            </div>
            <p className="text-sm text-gray-600">自動的にリセット画面へ移動します...</p>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <Link href="/login/user" className="text-purple-600 hover:text-purple-700 font-semibold block">
            ログイン画面に戻る
          </Link>
          <Link href="/" className="text-gray-500 hover:text-gray-700 block">
            トップページに戻る
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
