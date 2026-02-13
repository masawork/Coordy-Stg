'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bell, Lock, Shield, CreditCard, Video, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstructorSettingsPage() {
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    reservationReminder: true,
  });
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // URLパラメータからメッセージを取得
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      setMessage({ type: 'success', text: 'Google Meetが連携されました' });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        google_auth_denied: 'Google認証がキャンセルされました',
        missing_params: '認証パラメータが不足しています',
        invalid_state: '認証状態が無効です',
        no_tokens: 'トークンの取得に失敗しました',
        callback_failed: 'コールバック処理に失敗しました',
      };
      setMessage({ type: 'error', text: errorMessages[error] || 'エラーが発生しました' });
    }

    // Google連携状態を確認
    checkGoogleStatus();
  }, [searchParams]);

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/google/status');
      const data = await response.json();
      setGoogleConnected(data.connected);
    } catch (error) {
      console.error('Google status check failed:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = '/api/google/auth?returnUrl=/instructor/settings';
  };

  const handleGoogleDisconnect = async () => {
    if (!confirm('Google Meet連携を解除しますか？オンライン予約時にMeet URLが自動生成されなくなります。')) {
      return;
    }

    setGoogleDisconnecting(true);
    try {
      const response = await fetch('/api/google/status', { method: 'DELETE' });
      if (response.ok) {
        setGoogleConnected(false);
        setMessage({ type: 'success', text: 'Google連携を解除しました' });
      }
    } catch (error) {
      console.error('Google disconnect failed:', error);
      setMessage({ type: 'error', text: '連携解除に失敗しました' });
    } finally {
      setGoogleDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-sm text-gray-600 mt-1">アカウントと通知の設定を管理します</p>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Google Meet連携 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Video className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Google Meet連携</h2>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">オンラインミーティング</p>
              <p className="text-sm text-gray-500">
                オンライン予約時にGoogle Meet URLを自動生成します
              </p>
            </div>
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : googleConnected ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  連携済み
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleDisconnect}
                  disabled={googleDisconnecting}
                >
                  {googleDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '解除'
                  )}
                </Button>
              </div>
            ) : (
              <Button onClick={handleGoogleConnect}>
                <Video className="h-4 w-4 mr-2" />
                Googleと連携
              </Button>
            )}
          </div>
          {!googleConnected && !googleLoading && (
            <p className="text-xs text-gray-400 mt-2">
              ※ 連携するとオンラインサービス予約時にGoogle Calendarにイベントが作成され、Meet URLが自動生成されます
            </p>
          )}
        </div>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">通知設定</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">メール通知</p>
              <p className="text-sm text-gray-500">予約やメッセージをメールで受け取る</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">プッシュ通知</p>
              <p className="text-sm text-gray-500">ブラウザでプッシュ通知を受け取る</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">予約リマインダー</p>
              <p className="text-sm text-gray-500">予約の前日にリマインダーを送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.reservationReminder}
                onChange={(e) => setNotifications({ ...notifications, reservationReminder: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* セキュリティ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">セキュリティ</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">パスワード変更</p>
              <p className="text-sm text-gray-500">アカウントのパスワードを変更します</p>
            </div>
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              変更
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">二段階認証</p>
              <p className="text-sm text-gray-500">セキュリティを強化するための追加認証</p>
            </div>
            <Button variant="outline" size="sm">
              設定
            </Button>
          </div>
        </div>
      </div>

      {/* 支払い設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">支払い設定</h2>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">振込先口座</p>
              <p className="text-sm text-gray-500">報酬の振込先銀行口座を設定します</p>
            </div>
            <Button variant="outline" size="sm">
              設定
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
