'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import Button from '@/components/common/Button';

const client = generateClient<Schema>();

type InstructorWithStatus = {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  bio?: string | null;
  specialties?: (string | null)[] | null;
  identityDocumentUrl?: string | null;
  identityDocumentStatus?: string | null;
  identityDocumentSubmittedAt?: string | null;
  identityDocumentRejectionReason?: string | null;
};

export default function AdminDashboardPage() {
  const [instructors, setInstructors] = useState<InstructorWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      setError(null);

      // 全インストラクターを取得
      const { data, errors } = await client.models.Instructor.list();

      if (errors && errors.length > 0) {
        console.error('インストラクター取得エラー:', errors);
        setError('インストラクター情報の取得に失敗しました');
        return;
      }

      if (!data) {
        setInstructors([]);
        return;
      }

      // ユーザー情報も取得してマージ
      const instructorsWithEmail = await Promise.all(
        data.map(async (instructor) => {
          try {
            // UserテーブルからuserIdでフィルタして取得
            const { data: userList } = await client.models.User.list({
              filter: {
                userId: {
                  eq: instructor.userId,
                },
              },
            });

            const userData = userList && userList.length > 0 ? userList[0] : null;

            return {
              id: instructor.id,
              userId: instructor.userId,
              displayName: instructor.displayName,
              email: userData?.email,
              bio: instructor.bio,
              specialties: instructor.specialties,
              identityDocumentUrl: instructor.identityDocumentUrl,
              identityDocumentStatus: instructor.identityDocumentStatus || 'notSubmitted',
              identityDocumentSubmittedAt: instructor.identityDocumentSubmittedAt,
              identityDocumentRejectionReason: instructor.identityDocumentRejectionReason,
            };
          } catch (err) {
            console.error('ユーザー情報取得エラー:', err);
            return {
              id: instructor.id,
              userId: instructor.userId,
              displayName: instructor.displayName,
              email: undefined,
              bio: instructor.bio,
              specialties: instructor.specialties,
              identityDocumentUrl: instructor.identityDocumentUrl,
              identityDocumentStatus: instructor.identityDocumentStatus || 'notSubmitted',
              identityDocumentSubmittedAt: instructor.identityDocumentSubmittedAt,
              identityDocumentRejectionReason: instructor.identityDocumentRejectionReason,
            };
          }
        })
      );

      setInstructors(instructorsWithEmail);
    } catch (err) {
      console.error('インストラクター取得エラー:', err);
      setError('インストラクター情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (instructorId: string) => {
    try {
      setProcessing(instructorId);
      setError(null);

      const { errors } = await client.models.Instructor.update({
        id: instructorId,
        identityDocumentStatus: 'approved',
        identityDocumentApprovedAt: new Date().toISOString(),
        identityDocumentRejectionReason: null,
      });

      if (errors && errors.length > 0) {
        console.error('承認エラー:', errors);
        setError('承認処理に失敗しました');
        return;
      }

      // リストを再取得
      await fetchInstructors();
    } catch (err) {
      console.error('承認エラー:', err);
      setError('承認処理に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (instructorId: string) => {
    const reason = prompt('却下理由を入力してください:');
    if (!reason) return;

    try {
      setProcessing(instructorId);
      setError(null);

      const { errors } = await client.models.Instructor.update({
        id: instructorId,
        identityDocumentStatus: 'rejected',
        identityDocumentRejectionReason: reason,
      });

      if (errors && errors.length > 0) {
        console.error('却下エラー:', errors);
        setError('却下処理に失敗しました');
        return;
      }

      // リストを再取得
      await fetchInstructors();
    } catch (err) {
      console.error('却下エラー:', err);
      setError('却下処理に失敗しました');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            承認済み
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            却下
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            審査中
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <FileText className="w-4 h-4 mr-1" />
            未提出
          </span>
        );
    }
  };

  const pendingInstructors = instructors.filter(
    (i) => i.identityDocumentStatus === 'pending'
  );
  const approvedInstructors = instructors.filter(
    (i) => i.identityDocumentStatus === 'approved'
  );
  const rejectedInstructors = instructors.filter(
    (i) => i.identityDocumentStatus === 'rejected'
  );
  const notSubmittedInstructors = instructors.filter(
    (i) => !i.identityDocumentStatus || i.identityDocumentStatus === 'notSubmitted'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="mt-2 text-gray-600">
          インストラクターの身分証明書審査を管理します
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">審査待ち</p>
              <p className="text-3xl font-bold text-yellow-900">{pendingInstructors.length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">承認済み</p>
              <p className="text-3xl font-bold text-green-900">{approvedInstructors.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-800">却下</p>
              <p className="text-3xl font-bold text-red-900">{rejectedInstructors.length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">未提出</p>
              <p className="text-3xl font-bold text-gray-900">{notSubmittedInstructors.length}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-600" />
          </div>
        </motion.div>
      </div>

      {/* 審査待ちリスト */}
      {pendingInstructors.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">審査待ちインストラクター</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メールアドレス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      提出日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingInstructors.map((instructor) => (
                    <tr key={instructor.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {instructor.displayName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{instructor.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {instructor.identityDocumentSubmittedAt
                            ? new Date(instructor.identityDocumentSubmittedAt).toLocaleDateString('ja-JP')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(instructor.identityDocumentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {instructor.identityDocumentUrl && (
                          <a
                            href={instructor.identityDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            書類表示
                          </a>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(instructor.id)}
                          disabled={processing === instructor.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          承認
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleReject(instructor.id)}
                          disabled={processing === instructor.id}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          却下
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 全インストラクターリスト */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">全インストラクター</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    表示名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    専門分野
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instructors.map((instructor) => (
                  <tr key={instructor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {instructor.displayName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{instructor.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {instructor.specialties && instructor.specialties.length > 0
                          ? instructor.specialties.filter((s): s is string => s !== null).join(', ')
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(instructor.identityDocumentStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {instructors.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">登録されているインストラクターがいません</p>
        </div>
      )}
    </div>
  );
}
