'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAuthUser } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';
import { getProfile } from '@/lib/api/profile-client';
import { Button } from '@/components/ui/button';
import { User, Edit2, Mail, Award, MapPin, Calendar } from 'lucide-react';

type InstructorProfile = {
  id: string;
  displayName: string;
  bio: string;
  specialties: string[];
  profileImage?: string;
  status: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
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
      setUserName(authUser.user_metadata?.name || authUser.email || '');
      setUserEmail(authUser.email || '');

      // プロフィール（氏名・住所・生年月日）
      let fullName = '';
      let dateOfBirth = '';
      let address = '';
      let displayName = '';
      let profileComplete = false;
      try {
        const profile = await getProfile();
        if (profile) {
          fullName = profile.fullName || '';
          displayName = profile.displayName || '';
          address = profile.address || '';
          if (profile.dateOfBirth) {
            const dob = typeof profile.dateOfBirth === 'string'
              ? new Date(profile.dateOfBirth)
              : profile.dateOfBirth;
            if (!isNaN(new Date(dob as any).getTime())) {
              dateOfBirth = new Date(dob as any).toISOString().split('T')[0];
            }
          }
          // isProfileComplete がある場合はそれを優先、なければ必須項目有無で判定
          profileComplete = profile.isProfileComplete === true
            || (!!fullName && !!address && !!dateOfBirth);
        }
      } catch (e) {
        console.error('クライアントプロフィール取得エラー:', e);
      }

      const instructor = await fetchCurrentInstructor();
      if (instructor) {
        // specialties は Nullable<string>[] の可能性があるため、フィルタリング
        const specialtiesArray = (instructor.specialties || []).filter(
          (s: string | null | undefined): s is string => s !== null && s !== undefined
        );
        setProfile({
          id: instructor.id,
          displayName: displayName || instructor.user?.name || userName || '',
          bio: instructor.bio || '',
          specialties: specialtiesArray,
          profileImage: undefined, // TODO: profileImageはPrismaスキーマに未実装
          status: 'active', // TODO: statusはPrismaスキーマに未実装
          fullName,
          dateOfBirth,
          address,
        });
        // 必須項目が欠けていればセットアップへ誘導
        if (!profileComplete || !fullName || !address || !dateOfBirth) {
          router.push('/instructor/profile/setup');
          return;
        }
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

            {/* 氏名・生年月日・住所 */}
            {(profile?.fullName || profile?.dateOfBirth || profile?.address) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.fullName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">氏名</h3>
                    <p className="text-gray-800">{profile.fullName}</p>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div className="flex items-center gap-2 text-gray-800">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{profile.dateOfBirth}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center gap-2 text-gray-800">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{profile.address}</span>
                  </div>
                )}
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
