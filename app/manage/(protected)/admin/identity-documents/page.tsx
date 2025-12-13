'use client';

import { useState, useEffect } from 'react';
import { listInstructors, updateInstructor } from '@/lib/api/instructors';

export default function AdminIdentityDocumentsPage() {
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingDocuments();
  }, []);

  const loadPendingDocuments = async () => {
    try {
      setLoading(true);
      const allInstructors = await listInstructors();
      // pending ステータスのみ表示
      const pending = allInstructors.filter(
        (inst: any) => inst.identityDocumentStatus === 'pending'
      );
      setInstructors(pending);
      console.log('📋 審査待ち身分証明書:', pending.length, '件');
    } catch (error) {
      console.error('❌ 読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (instructorId: string) => {
    if (!confirm('この身分証明書を承認しますか？')) {
      return;
    }

    try {
      setProcessing(true);
      await updateInstructor(instructorId, {
        identityDocumentStatus: 'approved',
        identityDocumentApprovedAt: new Date().toISOString(),
      });
      alert('承認しました');
      await loadPendingDocuments();
    } catch (error) {
      console.error('❌ 承認エラー:', error);
      alert('承認に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (instructorId: string) => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }

    if (!confirm('この身分証明書を却下しますか？')) {
      return;
    }

    try {
      setProcessing(true);
      await updateInstructor(instructorId, {
        identityDocumentStatus: 'rejected',
        identityDocumentRejectionReason: rejectionReason,
      });
      alert('却下しました');
      setRejectionReason('');
      setSelectedInstructor(null);
      await loadPendingDocuments();
    } catch (error) {
      console.error('❌ 却下エラー:', error);
      alert('却下に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">身分証明書審査</h1>
        <button
          onClick={loadPendingDocuments}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          再読み込み
        </button>
      </div>

      {instructors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">審査待ちの書類はありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {instructor.displayName || '名前未設定'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ユーザーID: {instructor.userId}
                  </p>
                  <p className="text-sm text-gray-500">
                    提出日: {instructor.identityDocumentSubmittedAt
                      ? new Date(instructor.identityDocumentSubmittedAt).toLocaleString('ja-JP')
                      : '不明'}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                  審査中
                </span>
              </div>

              {/* 画像プレビュー */}
              <div className="mb-4">
                {instructor.identityDocumentUrl ? (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-2">身分証明書:</p>
                    {instructor.identityDocumentUrl.endsWith('.pdf') ? (
                      <a
                        href={instructor.identityDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        PDFを開く
                      </a>
                    ) : (
                      <img
                        src={instructor.identityDocumentUrl}
                        alt="身分証明書"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">画像がアップロードされていません</p>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedInstructor(instructor)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  却下する
                </button>
              </div>

              {/* 却下理由入力モーダル */}
              {selectedInstructor?.id === instructor.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    placeholder="却下理由を入力してください（例: 画像が不鮮明です、別の身分証明書を提出してください）"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReject(instructor.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstructor(null);
                        setRejectionReason('');
                      }}
                      disabled={processing}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
