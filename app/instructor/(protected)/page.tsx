/**
 * インストラクターダッシュボード
 * 今日の予約、サービス管理、売上概要を表示
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth/cognito';
import { getInstructorByUserId } from '@/lib/api/instructors';
import type { User } from '@/lib/auth';

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [showIdentityWarning, setShowIdentityWarning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndInstructor();
  }, []);

  const loadUserAndInstructor = async () => {
    try {
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        setUser(authUser as User);

        // インストラクター情報を取得
        const instructorData = await getInstructorByUserId(authUser.userId);
        if (instructorData) {
          setInstructor(instructorData);

          // 身分証明書が未承認の場合は警告を表示
          if (instructorData.identityDocumentStatus !== 'approved') {
            setShowIdentityWarning(true);
          }
        }
      }
    } catch (error) {
      console.error('ユーザー情報の読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          ようこそ、{user?.name || 'ゲスト'}さん！
        </h1>
        <p className="text-green-100">
          今日も素晴らしいレッスンを提供しましょう
        </p>
      </div>

      {/* 身分証明書警告バナー */}
      {showIdentityWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-yellow-700">
                <strong>身分証明書の提出が必要です。</strong>
                {instructor?.identityDocumentStatus === 'notSubmitted' && '承認されるまで、サービス作成と予約受付ができません。'}
                {instructor?.identityDocumentStatus === 'pending' && '現在審査中です。承認されるまでお待ちください。'}
                {instructor?.identityDocumentStatus === 'rejected' && '身分証明書が却下されました。再度提出してください。'}
              </p>
            </div>
            <button
              onClick={() => router.push('/instructor/identity-document')}
              className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium transition-colors"
            >
              {instructor?.identityDocumentStatus === 'notSubmitted' ? '提出する' : '確認する'}
            </button>
          </div>
        </div>
      )}

      {/* ダッシュボードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 今日の予約 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            今日の予約
          </h2>
          <div className="text-center py-8">
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-sm mt-2">件の予約</p>
          </div>
        </div>

        {/* サービス */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            登録サービス
          </h2>
          <div className="text-center py-8">
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-gray-500 text-sm mt-2">個のサービス</p>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            クイックアクション
          </h2>
          <div className="space-y-2">
            {instructor?.identityDocumentStatus === 'approved' ? (
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                新規サービス作成
              </button>
            ) : (
              <div>
                <button
                  disabled
                  className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  新規サービス作成
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※サービス作成には管理者の承認が必要です
                </p>
              </div>
            )}
            <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              スケジュール管理
            </button>
          </div>
        </div>
      </div>

      {/* 今週のスケジュール（今後実装） */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          今週のスケジュール
        </h2>
        <p className="text-gray-500">
          スケジュール機能は今後実装予定です
        </p>
      </div>
    </div>
  );
}
