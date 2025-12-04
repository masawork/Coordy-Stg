'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { mockUsers, type Role } from '@/lib/mock';

function LoginForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as Role;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roleConfig = {
    user: { label: 'ユーザー', color: 'bg-gray-800' },
    instructor: { label: 'インストラクター', color: 'bg-green-700' },
    admin: { label: '管理者', color: 'bg-orange-600' }
  };

  const mockUser = mockUsers[role]?.[0];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/${role}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError('ネットワークエラーが発生しました');
        return;
      }

      const data = await response.json();

      if (data.success) {
        router.push(data.redirectTo || `/${role}`);
        router.refresh();
      } else {
        setError(data.message || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleConfig = roleConfig[role];
  if (!currentRoleConfig || !mockUser) return <div>Invalid role</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className={`${currentRoleConfig.color} text-white p-4 rounded-t-lg`}>
          <h2 className="text-center text-2xl font-bold">
            {currentRoleConfig.label}ログイン
          </h2>
        </div>

        <div className="bg-white shadow-lg rounded-b-lg p-8">
          <p className="text-center text-sm text-gray-600 mb-6">
            テスト用認証情報<br/>
            ユーザー名: <code className="bg-gray-100 px-2 py-1 rounded">{mockUser.username}</code><br/>
            パスワード: <code className="bg-gray-100 px-2 py-1 rounded">{mockUser.password}</code>
          </p>

          <form onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                ユーザー名
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder={mockUser.username}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                パスワード
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${currentRoleConfig.color} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline hover:opacity-90 disabled:opacity-50`}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>別のロールでログイン:</p>
            <div className="mt-2 space-x-2">
              {role !== 'user' && (
                <a href="/user/login" className="text-blue-600 hover:underline">ユーザー</a>
              )}
              {role !== 'instructor' && (
                <a href="/instructor/login" className="text-green-600 hover:underline">インストラクター</a>
              )}
              {role !== 'admin' && (
                <a href="/admin/login" className="text-orange-600 hover:underline">管理者</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}