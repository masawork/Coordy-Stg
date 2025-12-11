'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getClientProfile } from '@/lib/api/profile';
import { Button } from '@/components/ui/button';
import { User, MapPin, Phone, Calendar, Users } from 'lucide-react';
import { toJapanDomesticPhoneNumber } from '@/lib/phone';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/login/user');
      return;
    }

    setUser(session);
    loadProfile(session.userId);
  }, [router]);

  const loadProfile = async (clientId: string) => {
    try {
      const profileData = await getClientProfile(clientId);
      setProfile(profileData);
    } catch (err) {
      console.error('プロフィール読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const genderLabels: { [key: string]: string } = {
    male: '男性',
    female: '女性',
    other: 'その他',
    'no-answer': '回答しない',
  };
  const displayPhoneNumber =
    profile?.phoneNumber
      ? toJapanDomesticPhoneNumber(profile.phoneNumber) || '-'
      : '-';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
              <p className="mt-1 text-sm text-gray-500">
                あなたの登録情報を確認できます
              </p>
            </div>
            <Button
              onClick={() => router.push('/user/profile/setup')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              編集
            </Button>
          </div>
        </div>

        {/* プロフィール情報 */}
        <div className="px-6 py-6 space-y-6">
          {/* 基本情報 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              基本情報
            </h2>
            <div className="space-y-4">
              {/* メールアドレス */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">メールアドレス</p>
                  <p className="mt-1 text-sm text-gray-900">{user?.email || '-'}</p>
                </div>
              </div>

              {/* 氏名 */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">氏名</p>
                  <p className="mt-1 text-sm text-gray-900">{profile?.name || '-'}</p>
                </div>
              </div>

              {/* 住所 */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">住所</p>
                  <p className="mt-1 text-sm text-gray-900">{profile?.address || '-'}</p>
                </div>
              </div>

              {/* 電話番号 */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">電話番号</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {displayPhoneNumber}
                  </p>
                </div>
              </div>

              {/* 生年月日 */}
              {profile?.dateOfBirth && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">生年月日</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {profile.dateOfBirth}
                    </p>
                  </div>
                </div>
              )}

              {/* 性別 */}
              {profile?.gender && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">性別</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {genderLabels[profile.gender] || profile.gender}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* アカウント情報 */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              アカウント情報
            </h2>
            <div className="space-y-4">
              {/* ロール */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">アカウントタイプ</p>
                  <span className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    クライアント
                  </span>
                </div>
              </div>

              {/* メール確認状態 */}
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">メール確認状態</p>
                  {user?.emailVerified ? (
                    <span className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      確認済み
                    </span>
                  ) : (
                    <span className="mt-1 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      未確認
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            プロフィール情報を変更する場合は、上部の「編集」ボタンをクリックしてください。
          </p>
        </div>
      </div>
    </div>
  );
}
