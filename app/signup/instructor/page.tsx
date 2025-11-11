'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signUp } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import { useValidation } from '@/lib/hooks/useValidation';
import '../../../src/lib/amplifyClient'; // Ensure Amplify is configured

export default function InstructorSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { errors, validate, validateAll } = useValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Password confirmation check
    if (password !== confirmPassword) {
      setErrorMessage('パスワードが一致しません');
      return;
    }

    // Validate all fields
    const isValid = validateAll({
      email,
      password,
      displayName: name,
    });

    if (!isValid) {
      setErrorMessage('入力内容を確認してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            name: name,
            'custom:userType': 'creator',
            'custom:role': 'CREATORS',
          },
        },
      });

      console.log('✅ サインアップ結果:', result);
      setSuccessMessage('登録が完了しました！TOPページに移動します。');

      // TOPページへリダイレクト
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMessage(error.message || '登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">クリエイター新規登録</h1>
          <p className="text-gray-600">サービスを提供する方のアカウント作成</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              お名前
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                validate('displayName', e.target.value);
              }}
              onBlur={(e) => validate('displayName', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.displayName
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-green-600'
              }`}
              placeholder="山田太郎"
            />
            {errors.displayName && (
              <p className="text-red-600 text-sm mt-1">{errors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validate('email', e.target.value);
              }}
              onBlur={(e) => validate('email', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.email
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-green-600'
              }`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validate('password', e.target.value);
              }}
              onBlur={(e) => validate('password', e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.password
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-green-600'
              }`}
              placeholder="8文字以上（英大文字・小文字・数字を含む）"
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password}</p>
            )}
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
              placeholder="パスワードを再入力"
            />
          </div>

          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={`w-full bg-green-600 hover:bg-green-700 transition-all duration-300 ${
              isSubmitting || errors.email || errors.password || errors.displayName
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
            disabled={isSubmitting || !!errors.email || !!errors.password || !!errors.displayName}
          >
            {isSubmitting ? '登録中...' : '新規登録'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            すでにアカウントをお持ちの方は
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
