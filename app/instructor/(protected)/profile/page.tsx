'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAuthUser } from '@/lib/auth/cognito';
import { getInstructorByUserId } from '@/lib/api/instructors';
import { Button } from '@/components/ui/button';
import { User, Edit2, Mail, Award } from 'lucide-react';

type InstructorProfile = {
  id: string;
  displayName: string;
  bio: string;
  specialties: string[];
  profileImage?: string;
  status: string;
};

export default function InstructorProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const authUser = await getCurrentAuthUser();
      setUserName(authUser.name || '');
      setUserEmail(authUser.email || '');

      const instructor = await getInstructorByUserId(authUser.userId);
      if (instructor) {
        // specialties は Nullable<string>[] の可能性があるため、フィルタリング
        const specialtiesArray = (instructor.specialties || []).filter(
          (s): s is string => s !== null && s !== undefined
        );
        setProfile({
          id: instructor.id,
          displayName: instructor.displayName || '',
          bio: instructor.bio || '',
          specialties: specialtiesArray,
          profileImage: instructor.profileImage || undefined,
          status: instructor.status || 'active',
        });
      }
    } catch (err) {
      console.error('プロフィール読み込みエラー:', err);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
        <Link href="/instructor/profile/setup">
          <Button variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" />
            編集
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-6">
          {/* プロフィール画像 */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-12 w-12 text-green-600" />
            </div>
          </div>

          {/* プロフィール情報 */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {profile?.displayName || userName || 'ゲスト'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <Mail className="h-4 w-4" />
                {userEmail}
              </div>
            </div>

            {/* 専門分野 */}
            {profile?.specialties && profile.specialties.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  専門分野
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full border border-green-200"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 自己紹介 */}
            {profile?.bio && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">自己紹介</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {/* ステータス */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">アカウント状態</h3>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  profile?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {profile?.status === 'active' ? '有効' : '審査中'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {!profile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            プロフィールが設定されていません。
            <Link href="/instructor/profile/setup" className="underline font-medium ml-1">
              プロフィールを設定する
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
