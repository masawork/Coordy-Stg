/**
 * インストラクターダッシュボード
 * 今日の予約、サービス管理、売上概要を表示
 */

'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';
import { getBankAccounts, BankAccount } from '@/lib/api/bank-client';
import type { User } from '@/lib/auth/types';

export default function InstructorDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [instructor, setInstructor] = useState<any>(null);
  const [identityStatus, setIdentityStatus] = useState<'approved' | 'pending' | 'rejected' | 'notSubmitted'>('notSubmitted');
  const [identityRejectedReason, setIdentityRejectedReason] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const ACK_KEY = 'instructor_rejected_ack';

  useEffect(() => {
    loadUserAndInstructor();
  }, []);

  const loadUserAndInstructor = async () => {
    try {
      const authUser = await getCurrentAuthUser();
      if (authUser) {
        setUser(authUser);

        // インストラクター情報を取得
        const instructorData = await fetchCurrentInstructor();
        if (instructorData) {
          setInstructor(instructorData);
        }

        // 本人確認ステータス取得
        try {
          const res = await fetch('/api/verification/identity/status');
          if (res.ok) {
            const data = await res.json();
            const reqStatus = data?.request?.status;
            if (reqStatus === 'approved' || data?.identityVerified) {
              setIdentityStatus('approved');
            } else if (reqStatus === 'pending') {
              setIdentityStatus('pending');
            } else if (reqStatus === 'rejected') {
              setIdentityStatus('rejected');
              setIdentityRejectedReason(data?.request?.rejectedReason || null);
            } else {
              setIdentityStatus('notSubmitted');
            }

            // 却下モーダル表示（ログインセッション中に1回のみ）
            if (
              (reqStatus && reqStatus.toLowerCase() === 'rejected') ||
              data?.request?.rejectedReason ||
              data?.identityRejectedReason
            ) {
              const acknowledged = typeof window !== 'undefined' ? sessionStorage.getItem(ACK_KEY) : null;
              if (!acknowledged) {
                setShowRejectedModal(true);
              }
            }
          } else {
            setIdentityStatus('notSubmitted');
          }
        } catch (err) {
          console.error('本人確認ステータス取得エラー:', err);
          setIdentityStatus('notSubmitted');
        }

        // 銀行口座取得
        try {
          const accounts = await getBankAccounts();
          setBankAccounts(accounts);
        } catch (err) {
          console.error('銀行口座取得エラー:', err);
          setBankAccounts([]);
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
      {/* 却下モーダル（セッション中一度） */}
      {showRejectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-red-700 mb-2">本人確認が却下されました</h3>
            <p className="text-sm text-gray-700 mb-3">
              再提出が必要です。以下の理由を確認のうえ、正しい書類を再度アップロードしてください。
            </p>
            {identityRejectedReason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                却下理由: {identityRejectedReason}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem(ACK_KEY, '1');
                  }
                  setShowRejectedModal(false);
                }}
              >
                OK
              </button>
              <button
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem(ACK_KEY, '1');
                  }
                  setShowRejectedModal(false);
                  router.push('/instructor/verification/identity');
                }}
              >
                再提出ページへ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          ようこそ、{user?.name || 'ゲスト'}さん！
        </h1>
        <p className="text-green-100">
          今日も素晴らしいレッスンを提供しましょう
        </p>
      </div>

      {/* 必須アクションカード（×で消せない） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {identityStatus !== 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">本人確認が必要です</p>
                <p className="text-lg font-bold text-green-900">
                  {identityStatus === 'pending' ? '審査中' : identityStatus === 'rejected' ? '再提出が必要です' : '未提出'}
                </p>
              </div>
            </div>
            {identityStatus === 'rejected' && identityRejectedReason && (
              <p className="text-sm text-red-700 mb-3">却下理由: {identityRejectedReason}</p>
            )}
            <p className="text-sm text-green-700 mb-4">
              サービスを作成するには本人確認の承認が必要です。書類を提出してください。
            </p>
            <button
              onClick={() => router.push('/instructor/verification/identity')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              本人確認書類を提出 →
            </button>
          </div>
        )}

        {bankAccounts.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🏦</span>
              <div>
                <p className="text-sm font-semibold text-orange-800">銀行口座が未登録です</p>
                <p className="text-lg font-bold text-orange-900">出金先を登録してください</p>
              </div>
            </div>
            <p className="text-sm text-orange-700 mb-4">
              銀行口座を登録すると収益の引き出しとサービス作成が可能になります。
            </p>
            <button
              onClick={() => router.push('/instructor/bank-accounts')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              銀行口座を登録 →
            </button>
          </div>
        )}
      </div>

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
            {identityStatus === 'approved' && bankAccounts.length > 0 ? (
              <button
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => router.push('/instructor/services/new')}
              >
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
                  ※サービス作成には本人確認の承認と銀行口座登録が必要です
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
