/**
 * 本人確認書類 確認ページ（管理者用）
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession } from '@/lib/auth';

interface VerificationRequest {
  id: string;
  userId: string;
  documentType: string;
  documentFrontUrl: string;
  documentBackUrl: string | null;
  additionalImages: string[];
  fullName: string;
  dateOfBirth: string;
  address: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectedReason: string | null;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    clientProfile: {
      fullName: string | null;
      phoneNumber: string | null;
      address: string | null;
      dateOfBirth: string | null;
      verificationLevel: number;
      phoneVerified: boolean;
      identityVerified: boolean;
    } | null;
  };
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function VerificationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/manage/login');
        return;
      }

      const response = await fetch(`/api/admin/verification/requests/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch request');
      }

      const data = await response.json();
      setRequest(data);
    } catch (error) {
      console.error('Load request error:', error);
      alert('申請の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('この本人確認書類を承認しますか？')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/verification/requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      alert('本人確認を承認しました');
      router.push('/manage/admin/verification');
    } catch (error) {
      console.error('Approve error:', error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectedReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/verification/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectedReason, adminNote }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      alert('本人確認を却下しました');
      router.push('/manage/admin/verification');
    } catch (error) {
      console.error('Reject error:', error);
      alert('却下に失敗しました');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'license':
        return '運転免許証';
      case 'mynumber':
        return 'マイナンバーカード';
      case 'passport':
        return 'パスポート';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          申請が見つかりません
        </div>
      </div>
    );
  }

  const isPending = request.status === 'pending';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/manage/admin/verification')}
          className="text-purple-600 hover:text-purple-800 mb-4"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          📄 本人確認書類の確認
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左カラム: ユーザー情報・書類情報 */}
        <div className="space-y-6">
          {/* ユーザー情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">👤 ユーザー情報</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">氏名:</span> {request.user.name}
              </p>
              <p>
                <span className="font-semibold">メール:</span> {request.user.email}
              </p>
              <p>
                <span className="font-semibold">電話番号:</span>{' '}
                {request.user.clientProfile?.phoneNumber || '未登録'}
                {request.user.clientProfile?.phoneVerified && ' ✅'}
              </p>
              <p>
                <span className="font-semibold">現在の認証レベル:</span> Level{' '}
                {request.user.clientProfile?.verificationLevel || 0}
              </p>
            </div>
          </div>

          {/* 提出書類情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 提出書類情報</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">書類種類:</span>{' '}
                {getDocumentTypeLabel(request.documentType)}
              </p>
              <p>
                <span className="font-semibold">提出日時:</span>{' '}
                {new Date(request.createdAt).toLocaleString('ja-JP')}
              </p>
              <hr className="my-3" />
              <p>
                <span className="font-semibold">氏名（書類）:</span> {request.fullName}
              </p>
              <p>
                <span className="font-semibold">生年月日:</span>{' '}
                {new Date(request.dateOfBirth).toLocaleDateString('ja-JP')}
              </p>
              <p>
                <span className="font-semibold">住所:</span> {request.address}
              </p>
            </div>
          </div>

          {/* 管理者メモ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📝 管理者メモ（任意）</h2>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
              placeholder="内部用のメモを入力..."
              disabled={!isPending}
            />
          </div>
        </div>

        {/* 右カラム: 書類画像 */}
        <div className="space-y-6">
          {/* 表面画像 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📸 表面</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <img
                src={request.documentFrontUrl}
                alt="書類表面"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => window.open(request.documentFrontUrl, '_blank')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                🔍 拡大表示
              </button>
              <a
                href={request.documentFrontUrl}
                download
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                ⬇️ ダウンロード
              </a>
            </div>
          </div>

          {/* 裏面画像 */}
          {request.documentBackUrl && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📸 裏面</h2>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={request.documentBackUrl}
                  alt="書類裏面"
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => window.open(request.documentBackUrl!, '_blank')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  🔍 拡大表示
                </button>
                <a
                  href={request.documentBackUrl}
                  download
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  ⬇️ ダウンロード
                </a>
              </div>
            </div>
          )}

          {/* 補足画像 */}
          {request.additionalImages && request.additionalImages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📎 補足写真</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {request.additionalImages.map((url, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden relative">
                    <img src={url} alt={`補足 ${idx + 1}`} className="w-full h-auto" />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => window.open(url, '_blank')}
                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                      >
                        🔍
                      </button>
                      <a
                        href={url}
                        download
                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                      >
                        ⬇️
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      {isPending && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {processing ? '処理中...' : '✅ 承認する'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              ❌ 却下する
            </button>
          </div>
        </div>
      )}

      {/* 承認済み/却下済みの場合 */}
      {!isPending && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="text-center">
            {request.status === 'approved' && (
              <div className="text-green-600">
                <p className="text-2xl font-bold mb-2">✅ 承認済み</p>
                <p className="text-sm">
                  承認日時: {new Date(request.reviewedAt!).toLocaleString('ja-JP')}
                </p>
                {request.reviewer && (
                  <p className="text-sm">承認者: {request.reviewer.name}</p>
                )}
              </div>
            )}
            {request.status === 'rejected' && (
              <div className="text-red-600">
                <p className="text-2xl font-bold mb-2">❌ 却下済み</p>
                <p className="text-sm">
                  却下日時: {new Date(request.reviewedAt!).toLocaleString('ja-JP')}
                </p>
                {request.reviewer && (
                  <p className="text-sm mb-3">却下者: {request.reviewer.name}</p>
                )}
                {request.rejectedReason && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg text-left">
                    <p className="font-semibold mb-2">却下理由:</p>
                    <p className="text-sm">{request.rejectedReason}</p>
                  </div>
                )}
              </div>
            )}
            {request.adminNote && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <p className="font-semibold mb-2">管理者メモ:</p>
                <p className="text-sm">{request.adminNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 却下モーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">本人確認を却下</h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                却下理由（必須）
              </label>
              <textarea
                value={rejectedReason}
                onChange={(e) => setRejectedReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="ユーザーへ送信される理由を入力..."
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                よくある却下理由:
              </p>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() =>
                    setRejectedReason('書類の鮮明度が不足しています。明るい場所で再撮影をお願いします。')
                  }
                  className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  • 書類の鮮明度が不足
                </button>
                <button
                  onClick={() =>
                    setRejectedReason('書類に記載の氏名とアカウント情報が一致しません。正しい書類をアップロードしてください。')
                  }
                  className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  • 氏名の不一致
                </button>
                <button
                  onClick={() =>
                    setRejectedReason('提出いただいた書類の有効期限が切れています。有効期限内の書類を提出してください。')
                  }
                  className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  • 有効期限切れ
                </button>
                <button
                  onClick={() =>
                    setRejectedReason('書類の一部が写っていません。書類全体が収まるように再撮影をお願いします。')
                  }
                  className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  • 書類の一部が欠けている
                </button>
                <button
                  onClick={() =>
                    setRejectedReason('運転免許証の裏面画像が不足しています。表面・裏面の両方を提出してください。')
                  }
                  className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  • 裏面画像が不足
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={processing}
              >
                キャンセル
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectedReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {processing ? '処理中...' : '却下を確定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
