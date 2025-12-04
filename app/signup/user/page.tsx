'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { signUp, fetchAuthSession } from 'aws-amplify/auth';
import { useRouter } from 'next/navigation';
import Button from '@/components/common/Button';
import '../../../src/lib/amplifyClient'; // Ensure Amplify is configured

export default function UserSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Test code: Verify Amplify Auth initialization
  useEffect(() => {
    fetchAuthSession()
      .then(() => console.log('✅ Amplify認証初期化成功'))
      .catch((err) => console.error('❌ Amplify初期化エラー', err));
  }, []);

  // フィールドごとのバリデーション関数
  const validateFields = () => {
    const errors: typeof fieldErrors = {};

    if (!email || email.trim() === '') {
      errors.email = 'メールアドレスを入力してください';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'メールアドレスの形式が正しくありません';
      }
    }

    if (!password) {
      errors.password = 'パスワードを入力してください';
    } else if (password.length < 8) {
      errors.password = 'パスワードは8文字以上である必要があります';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'パスワードには英大文字を含める必要があります';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'パスワードには英小文字を含める必要があります';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'パスワードには数字を含める必要があります';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'パスワード確認を入力してください';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setFieldErrors({});

    console.log('🔍 サインアップ開始:', { email });

    // フロントエンドバリデーション
    const isValid = validateFields();
    if (!isValid) {
      console.error('❌ バリデーションエラー:', fieldErrors);
      setErrorMessage('入力内容に誤りがあります。各フィールドのエラーメッセージを確認してください。');
      return;
    }

    console.log('✅ フロントエンドバリデーション通過');

    setIsSubmitting(true);

    try {
      console.log('📤 Cognito signUp 実行中...', {
        username: email,
      });

      const userAttributes: Record<string, string> = {
        'custom:userType': 'CLIENT',
        'custom:role': 'user',
      };

      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes,
        },
      });

      console.log('✅ サインアップ成功:', result);
      setSuccessMessage('登録が完了しました！確認コード入力画面に移動します。');

      // 確認コード入力画面へリダイレクト
      setTimeout(() => {
        console.log('🔄 /verify へリダイレクト');
        router.push(`/verify?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (error: any) {
      console.error('❌ Cognito サインアップエラー:', error);
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        code: error.code,
      });

      // エラーメッセージを日本語化
      let friendlyMessage = '登録に失敗しました。';

      if (error.name === 'UsernameExistsException' || error.code === 'UsernameExistsException') {
        friendlyMessage = 'このメールアドレスは既に登録されています。別のメールアドレスをお試しください。';
      } else if (error.name === 'InvalidPasswordException' || error.code === 'InvalidPasswordException') {
        friendlyMessage = 'パスワードが要件を満たしていません。8文字以上で、大文字・小文字・数字を含めてください。';
      } else if (error.name === 'InvalidParameterException' || error.code === 'InvalidParameterException') {
        friendlyMessage = '入力内容に問題があります。すべての項目を正しく入力してください。';
      } else if (error.message) {
        friendlyMessage = `エラー: ${error.message}`;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">クライアント新規登録</h1>
          <p className="text-gray-600">メールアドレスとパスワードのみでアカウントを作成します</p>
        </div>

        <div className="mb-6 rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-purple-700">プロフィール情報の入力は次のステップで行います</p>
          <p className="mt-1">
            サインアップ完了後、<span className="font-semibold">/user/profile/setup</span> に遷移して
            氏名や電話番号などの個人情報を1回だけ入力します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              メールアドレス<span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                fieldErrors.email
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-purple-600'
              }`}
              placeholder="your@email.com"
            />
            {fieldErrors.email && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* パスワード */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                fieldErrors.password
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-purple-600'
              }`}
              placeholder="8文字以上（英大文字・小文字・数字を含む）"
            />
            {fieldErrors.password && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.password}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              ※ 8文字以上、英大文字・英小文字・数字をそれぞれ1文字以上含める
            </p>
          </div>

          {/* パスワード確認 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              パスワード確認<span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                fieldErrors.confirmPassword
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-gray-200 focus:border-purple-600'
              }`}
              placeholder="パスワードを再入力"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{fieldErrors.confirmPassword}</p>
            )}
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
            className={`w-full bg-purple-600 hover:bg-purple-700 transition-all duration-300 ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? '登録中...' : '新規登録'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            すでにアカウントをお持ちの方は
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
