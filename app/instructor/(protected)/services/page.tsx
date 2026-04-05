'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Package, Edit, Trash2, Copy, Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listServices, deleteService } from '@/lib/api/services';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';
import { getBankAccounts, BankAccount } from '@/lib/api/bank-client';

export default function InstructorServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorId, setInstructorId] = useState<string>('');
  const [identityApproved, setIdentityApproved] = useState<boolean>(false);
  const [hasBankAccount, setHasBankAccount] = useState<boolean>(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [prereqError, setPrereqError] = useState<string>('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setPrereqError('');
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      // インストラクター情報を取得
      const instructor = await fetchCurrentInstructor();
      if (!instructor) {
        router.push('/instructor/profile/setup');
        return;
      }

      setInstructorId(instructor.id);

      // 本人確認ステータス
      let approved = false;
      let statusRes = await fetch('/api/verification/identity/status');
      if (statusRes.status === 404 && session.user) {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId: session.user.id }),
        }).catch(() => {});
        statusRes = await fetch('/api/verification/identity/status');
      }
      if (statusRes.ok) {
        const status = await statusRes.json();
        approved =
          status?.request?.status === 'approved' ||
          status?.identityVerified === true;
      } else {
        approved = false;
      }
      setIdentityApproved(approved);

      // 銀行口座
      let hasAccount = false;
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
        hasAccount = accounts.length > 0;
      } catch (err: unknown) {
        console.error('Bank account load error:', err);
        hasAccount = false;
      }
      setHasBankAccount(hasAccount);

      if (!approved) {
        setPrereqError('本人確認が未承認のため、サービスを作成できません。');
      } else if (!hasAccount) {
        setPrereqError('銀行口座が未登録のため、サービスを作成できません。');
      }

      // 自分のサービスのみ取得
      const myServices = await listServices({ instructorId: instructor.id });
      setServices(myServices || []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('このサービスを削除しますか？')) {
      return;
    }

    try {
      await deleteService(serviceId);
      await loadServices();
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('サービスの削除に失敗しました');
    }
  };

  const handlePublishRequest = async (serviceId: string) => {
    if (!confirm('このサービスの公開を申請しますか？管理者の承認後に公開されます。')) {
      return;
    }

    try {
      const res = await fetch('/api/services/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || '公開申請に失敗しました');
        return;
      }
      alert(data.message);
      await loadServices();
    } catch (error) {
      console.error('Failed to request publish:', error);
      alert('公開申請に失敗しました');
    }
  };

  const handleCancelPublishRequest = async (serviceId: string) => {
    if (!confirm('公開申請を取り下げますか？')) {
      return;
    }

    try {
      const res = await fetch(`/api/services/publish?serviceId=${serviceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || '取り下げに失敗しました');
        return;
      }
      alert(data.message);
      await loadServices();
    } catch (error) {
      console.error('Failed to cancel publish request:', error);
      alert('取り下げに失敗しました');
    }
  };

  const getPublishStatusBadge = (service: Record<string, unknown>) => {
    const status = service.publishStatus as string || 'DRAFT';
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            下書き
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            申請中
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            公開中
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            却下
          </span>
        );
      case 'WITHDRAWN':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
            取り下げ
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">サービス管理</h1>
          <p className="text-sm text-gray-600 mt-1">提供するサービスを管理します</p>
        </div>
        <div className="flex gap-2">
          {services.length > 0 && (
            <Link href="/instructor/services/new?from=template">
              <Button
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50 disabled:border-gray-300 disabled:text-gray-400"
                disabled={!identityApproved || !hasBankAccount}
                title="既存サービスをテンプレートとして複製"
              >
                <Copy className="h-4 w-4 mr-2" />
                テンプレートから作成
              </Button>
            </Link>
          )}
          <Link href="/instructor/services/new">
            <Button
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
              disabled={!identityApproved || !hasBankAccount}
              title={!identityApproved ? '本人確認の承認が必要です' : !hasBankAccount ? '銀行口座登録が必要です' : undefined}
            >
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {prereqError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
          {prereqError}{' '}
          {!identityApproved && (
            <button
              className="text-blue-700 underline underline-offset-2 ml-2"
              onClick={() => router.push('/instructor/verification/identity')}
            >
              本人確認へ
            </button>
          )}
          {identityApproved && !hasBankAccount && (
            <button
              className="text-blue-700 underline underline-offset-2 ml-2"
              onClick={() => router.push('/instructor/bank-accounts')}
            >
              銀行口座を登録する
            </button>
          )}
        </div>
      )}

      {services.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            サービスがまだありません
          </h2>
          <p className="text-gray-500 mb-6">
            最初のサービスを作成して、顧客への提供を開始しましょう。
          </p>
          <Link href="/instructor/services/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            サービスを作成
          </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  サービス名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  カテゴリ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  価格
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{service.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {service.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    ¥{service.price?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {getPublishStatusBadge(service)}
                      {['REJECTED', 'WITHDRAWN'].includes(service.publishStatus) && service.publishRejectReason && (
                        <span className={`text-xs ${service.publishStatus === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`} title={service.publishRejectReason}>
                          理由: {service.publishRejectReason.length > 20
                            ? service.publishRejectReason.slice(0, 20) + '...'
                            : service.publishRejectReason}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      {/* 公開申請ボタン（DRAFT / REJECTED のみ） */}
                      {['DRAFT', 'REJECTED'].includes(service.publishStatus || 'DRAFT') && (
                        <button
                          onClick={() => handlePublishRequest(service.id)}
                          className="text-blue-600 hover:text-blue-900 mr-2 inline-flex items-center text-xs font-medium bg-blue-50 px-2 py-1 rounded"
                          title="公開申請"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          公開申請
                        </button>
                      )}
                      {/* 申請取り下げ（PENDING_REVIEW のみ） */}
                      {service.publishStatus === 'PENDING_REVIEW' && (
                        <button
                          onClick={() => handleCancelPublishRequest(service.id)}
                          className="text-orange-600 hover:text-orange-900 mr-2 inline-flex items-center text-xs font-medium bg-orange-50 px-2 py-1 rounded"
                          title="申請取り下げ"
                        >
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                          取り下げ
                        </button>
                      )}
                      {service.publishStatus === 'PENDING_REVIEW' ? (
                        <span className="text-xs text-gray-400" title="審査中は編集・削除できません">
                          <Edit className="h-4 w-4 inline mr-1 opacity-30" />
                          審査中
                        </span>
                      ) : (
                        <>
                          <Link href={`/instructor/services/${service.id}/edit`}>
                            <button className="text-gray-600 hover:text-gray-900 mr-2" title="編集">
                              <Edit className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/instructor/services/new?template=${service.id}`}>
                            <button className="text-green-600 hover:text-green-900 mr-2" title="テンプレートとして複製">
                              <Copy className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-900"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
