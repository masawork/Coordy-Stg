'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Tag, Edit, Trash2, Calendar, Percent, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listCampaigns, deleteCampaign, getCampaignTypeLabel, Campaign } from '@/lib/api/campaigns';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';

export default function InstructorCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructorId, setInstructorId] = useState<string>('');

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      const instructor = await fetchCurrentInstructor();
      if (!instructor) {
        router.push('/instructor/profile/setup');
        return;
      }

      setInstructorId(instructor.id);
      const myCampaigns = await listCampaigns({ instructorId: instructor.id });
      setCampaigns(myCampaigns || []);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このキャンペーンを削除しますか？')) return;
    try {
      await deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Delete campaign error:', error);
      alert('キャンペーンの削除に失敗しました');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (campaign: Campaign) => {
    return new Date(campaign.validUntil) < new Date();
  };

  const isNotStarted = (campaign: Campaign) => {
    return new Date(campaign.validFrom) > new Date();
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (!campaign.isActive) return { label: '非公開', color: 'bg-gray-100 text-gray-600' };
    if (isExpired(campaign)) return { label: '終了', color: 'bg-red-100 text-red-600' };
    if (isNotStarted(campaign)) return { label: '開始前', color: 'bg-yellow-100 text-yellow-600' };
    return { label: '実施中', color: 'bg-green-100 text-green-600' };
  };

  const getDiscountDisplay = (campaign: Campaign) => {
    if (campaign.discountPercent) return `${campaign.discountPercent}% OFF`;
    if (campaign.discountAmount) return `¥${campaign.discountAmount.toLocaleString()} OFF`;
    if (campaign.fixedPrice) return `¥${campaign.fixedPrice.toLocaleString()}`;
    return '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">キャンペーン管理</h1>
          <p className="text-sm text-gray-600 mt-1">割引キャンペーンを作成・管理できます</p>
        </div>
        <Link href="/instructor/campaigns/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            新規キャンペーン
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">キャンペーンがありません</h3>
          <p className="text-gray-600 mb-4">
            割引キャンペーンを作成して、新規顧客を獲得しましょう
          </p>
          <Link href="/instructor/campaigns/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              キャンペーンを作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const status = getCampaignStatus(campaign);
            return (
              <div
                key={campaign.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Tag className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {campaign.description && (
                      <p className="text-gray-600 text-sm mb-3">{campaign.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Percent className="h-4 w-4" />
                        <span>{getCampaignTypeLabel(campaign.type)}</span>
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-green-600">
                        {getDiscountDisplay(campaign)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(campaign.validFrom)} 〜 {formatDate(campaign.validUntil)}
                        </span>
                      </div>
                      {campaign.service && (
                        <div className="text-gray-600">
                          対象: {campaign.service.title}
                        </div>
                      )}
                      {!campaign.service && (
                        <div className="text-blue-600">対象: 全サービス</div>
                      )}
                    </div>

                    {campaign.maxTotalUsage && (
                      <div className="mt-2 text-sm text-gray-500">
                        利用回数: {campaign.currentUsage} / {campaign.maxTotalUsage}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link href={`/instructor/campaigns/${campaign.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(campaign.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
