/**
 * クライアントダッシュボード（Supabase Auth）
 * 予約、TODO、カレンダーの概要を表示
 */

'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getNotifications, Notification } from '@/lib/api/notification-client';
import { getPaymentMethods } from '@/lib/api/payment-client';
import { getAnnouncements, Announcement } from '@/lib/api/announcement-client';
import NotificationBanner from '@/components/notifications/NotificationBanner';

interface Profile {
  verificationLevel: number;
  phoneVerified: boolean;
  identityVerified: boolean;
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [identityRequestStatus, setIdentityRequestStatus] = useState<string | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // 警告の表示/非表示状態
  const [showVerificationAlert, setShowVerificationAlert] = useState(true);
  const [showPaymentAlert, setShowPaymentAlert] = useState(true);

  useEffect(() => {
    // LocalStorageから警告の表示状態を読み込む
    const savedVerificationAlert = localStorage.getItem('hideVerificationAlert');
    const savedPaymentAlert = localStorage.getItem('hidePaymentAlert');
    if (savedVerificationAlert === 'true') setShowVerificationAlert(false);
    if (savedPaymentAlert === 'true') setShowPaymentAlert(false);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (session?.user) {
        setDisplayName(session.user.user_metadata?.name || session.user.email || 'ユーザー');

        // プロフィール取得（check-role APIを使用して正しいPrismaユーザーIDでプロフィールを取得）
        try {
          const response = await fetch('/api/auth/check-role?role=user', {
            credentials: 'include',
          });
          if (response.ok) {
            const { profile: profileData } = await response.json();
            console.log('📋 Dashboard - Profile data loaded:', {
              verificationLevel: profileData?.verificationLevel,
              phoneVerified: profileData?.phoneVerified,
              identityVerified: profileData?.identityVerified,
              isProfileComplete: profileData?.isProfileComplete,
            });
            setProfile({
              verificationLevel: profileData?.verificationLevel || 0,
              phoneVerified: profileData?.phoneVerified || false,
              identityVerified: profileData?.identityVerified || false,
            });
          }
        } catch (error) {
          console.error('❌ Load profile error:', error);
        }

        // 本人確認リクエストのステータスを取得
        try {
          const res = await fetch('/api/verification/identity/status');
          if (res.ok) {
            const statusData = await res.json();
            setIdentityRequestStatus(statusData.request?.status || null);
          }
        } catch (error) {
          console.error('Load identity status error:', error);
        }

        // 支払い方法確認
        try {
          const paymentMethods = await getPaymentMethods();
          setHasPaymentMethod(paymentMethods.length > 0);
        } catch (error) {
          console.error('Load payment methods error:', error);
        }

        // 通知取得
        try {
          const notificationsData = await getNotifications(true); // 未読のみ
          setNotifications(notificationsData.slice(0, 3)); // 最新3件
        } catch (error) {
          console.error('Load notifications error:', error);
        }

        // お知らせ取得
        try {
          const announcementsData = await getAnnouncements('users', 5); // 生徒向け最新5件
          setAnnouncements(announcementsData);
        } catch (error) {
          console.error('Load announcements error:', error);
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // 本人確認警告を閉じる
  const hideVerificationAlert = () => {
    setShowVerificationAlert(false);
    localStorage.setItem('hideVerificationAlert', 'true');
  };

  // 支払い方法警告を閉じる
  const hidePaymentAlert = () => {
    setShowPaymentAlert(false);
    localStorage.setItem('hidePaymentAlert', 'true');
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

  const getVerificationLevelInfo = () => {
    if (!profile) return null;

    // デバッグログ
    console.log('📊 Verification Status:', {
      phoneVerified: profile.phoneVerified,
      identityVerified: profile.identityVerified,
      verificationLevel: profile.verificationLevel,
    });

    // phoneVerified と identityVerified に基づいて判定
    // 注意: プロフィール設定完了後は必ず phoneVerified = true (Level 1)
    if (profile.identityVerified) {
      // Level 2: 本人確認済み
      return {
        level: 'Level 2',
        title: '本人確認済み',
        description: 'すべてのサービスをご利用いただけます',
        subDescription: 'キャンセルポリシー: 30分前まで無料',
        action: null,
        actionUrl: null,
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '✅',
      };
    } else if (profile.phoneVerified) {
      const pendingLike = identityRequestStatus === 'pending' || identityRequestStatus === 'revision_required';
      // Level 1: 電話番号認証済み（基本認証）
      return pendingLike
        ? {
            level: 'Level 1',
            title: '本人確認書類提出中',
            description: '審査中です。内容を修正するとステータスが更新されます。',
            subDescription: '追加の補足写真や修正がある場合は再提出してください。',
            action: '修正する',
            actionUrl: '/user/verification/identity',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            icon: '⏳',
          }
        : {
            level: 'Level 1',
            title: '電話番号認証済み',
            description: '基本的なサービスをご利用いただけます',
            subDescription: 'キャンセルポリシー: 1時間前まで無料',
            action: '本人確認書類を提出',
            actionUrl: '/user/verification/identity',
            color: 'bg-green-100 text-green-800 border-green-300',
            icon: '✅',
          };
    } else {
      // Level 0: 未認証（通常は表示されない）
      return {
        level: 'Level 0',
        title: '未認証',
        description: '電話番号認証を完了して、サービスを利用できるようにしましょう',
        subDescription: '',
        action: '電話番号を認証',
        actionUrl: '/user/verification/phone',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: '🔒',
      };
    }
  };

  const verificationInfo = getVerificationLevelInfo();

  return (
    <div className="space-y-6">
      {/* 通知バナー */}
      <NotificationBanner />

      {/* 電話番号未認証の警告（非表示にできない重要な警告） */}
      {profile && !profile.phoneVerified && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <h3 className="font-bold text-red-800">電話番号が未認証です</h3>
              <p className="text-sm text-red-700">
                サービスを利用するには、電話番号認証を完了してください。
              </p>
            </div>
            <button
              onClick={() => router.push('/user/profile/setup')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm whitespace-nowrap"
            >
              認証する →
            </button>
          </div>
        </div>
      )}

      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          ようこそ、{displayName}さん！
        </h1>
        <p className="text-purple-100">
          今日も素晴らしい一日にしましょう
        </p>
      </div>

      {/* 重要なお知らせ・アクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 本人確認ステータス */}
        {showVerificationAlert && verificationInfo && verificationInfo.level !== 'Level 2' && (
          <div className={`rounded-lg shadow-lg border-2 p-6 ${verificationInfo.color} relative`}>
            <button
              onClick={hideVerificationAlert}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition-colors"
              title="閉じる"
            >
              ✕
            </button>
            <div className="flex items-start gap-4">
              <span className="text-4xl">{verificationInfo.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-bold">
                    {verificationInfo.level}
                  </span>
                  <h3 className="text-lg font-bold">{verificationInfo.title}</h3>
                </div>
                <p className="text-sm mb-2 opacity-90">
                  {verificationInfo.description}
                </p>
                {verificationInfo.subDescription && (
                  <p className="text-xs opacity-75" style={{ marginBottom: verificationInfo.action ? '1rem' : '0' }}>
                    {verificationInfo.subDescription}
                  </p>
                )}
                {verificationInfo.action && verificationInfo.actionUrl && (
                  <button
                    onClick={() => router.push(verificationInfo.actionUrl)}
                    className="px-4 py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg font-semibold text-sm transition-colors shadow mt-2"
                  >
                    {verificationInfo.action} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 支払い方法登録 */}
        {showPaymentAlert && !hasPaymentMethod && (
          <div className="bg-orange-100 text-orange-800 border-2 border-orange-300 rounded-lg shadow-lg p-6 relative">
            <button
              onClick={hidePaymentAlert}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 transition-colors"
              title="閉じる"
            >
              ✕
            </button>
            <div className="flex items-start gap-4">
              <span className="text-4xl">💳</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">支払い方法が未登録です</h3>
                <p className="text-sm mb-4 opacity-90">
                  クレジットカードを登録すると、スムーズに予約できます
                </p>
                <button
                  onClick={() => router.push('/user/payment-methods')}
                  className="px-4 py-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-lg font-semibold text-sm transition-colors shadow"
                >
                  カードを登録 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 本人確認完了 & カード登録済みの場合 */}
        {verificationInfo?.level === 'Level 2' && hasPaymentMethod && (
          <div className="bg-green-100 text-green-800 border-2 border-green-300 rounded-lg shadow-lg p-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🎉</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">すべての設定が完了しています！</h3>
                <p className="text-sm opacity-90">
                  すべての機能をご利用いただけます。素敵なレッスンをお楽しみください！
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 最新の通知 */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">📢 最新の通知</h2>
            <button
              onClick={() => router.push('/user/notifications')}
              className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
            >
              すべて見る →
            </button>
          </div>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                onClick={() => {
                  if (notification.actionUrl) {
                    router.push(notification.actionUrl);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {notification.priority === 'critical' && '🚨'}
                    {notification.priority === 'high' && '⚠️'}
                    {notification.priority === 'medium' && 'ℹ️'}
                    {notification.priority === 'low' && '💡'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* お知らせ（管理者・講師からの情報） */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">📰 お知らせ</h2>
          <button
            onClick={() => router.push('/user/announcements')}
            className="text-sm text-purple-600 hover:text-purple-800 font-semibold"
          >
            すべて見る →
          </button>
        </div>
        {announcements.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">現在、お知らせはありません</p>
            <p className="text-xs text-gray-400 mt-2">
              管理者や講師からのお知らせがここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => router.push(`/user/announcements/${announcement.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {announcement.priority === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-semibold rounded">
                          重要
                        </span>
                      )}
                      {announcement.author?.role === 'INSTRUCTOR' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                          講師より
                        </span>
                      )}
                      <p className="font-semibold text-gray-900 text-sm">
                        {announcement.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ダッシュボードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 予約カード */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 予約</h3>
          <p className="text-gray-600 text-sm mb-4">直近の予約はありません</p>
          <button
            onClick={() => router.push('/user/reservations')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            予約を見る →
          </button>
        </div>

        {/* ウォレットカード */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 ウォレット</h3>
          <p className="text-gray-600 text-sm mb-4">ポイント残高を確認</p>
          <button
            onClick={() => router.push('/user/wallet')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            ウォレットを見る →
          </button>
        </div>

        {/* お気に入りカード */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">⭐ お気に入り</h3>
          <p className="text-gray-600 text-sm mb-4">お気に入りのクリエイター</p>
          <button
            onClick={() => router.push('/user/favorites')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            お気に入りを見る →
          </button>
        </div>
      </div>

      {/* サービス検索 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🔍 サービスを探す
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/services')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            サービス一覧を見る
          </button>
        </div>
      </div>
    </div>
  );
}
