# Coordy 追加実装計画

このドキュメントは、今後実装する機能の設計と実装手順をまとめたものです。

## 実装済み項目

### ✅ データスキーマ更新
- ClientProfile に `themeColor` フィールド追加
- ClientProfile の `phoneNumber` を `a.phone()` 型に変更
- Instructor に身分証明書関連フィールド追加:
  - `identityDocumentUrl`: S3 URL
  - `identityDocumentStatus`: 'notSubmitted' | 'pending' | 'approved' | 'rejected'
  - `identityDocumentSubmittedAt`: 提出日時
  - `identityDocumentApprovedAt`: 承認日時
  - `identityDocumentRejectionReason`: 却下理由

### ✅ UIバグ修正
- TOPページヒーローセクションの表示問題を修正
- /user のクイックアクション「サービスを探す」を /user/services に遷移するよう修正
- ログアウト処理は常に / に戻るよう実装済み
- ハンバーガーメニューのトグル動作実装済み

---

## 今後実装する機能

### 1. サインアップ画面への電話番号フィールド追加

**優先度**: 高

**対象ファイル**:
- `app/signup/user/page.tsx`
- `app/signup/instructor/page.tsx`

**実装内容**:

#### ステップ1: stateに電話番号を追加
```typescript
const [phoneNumber, setPhoneNumber] = useState('');
```

#### ステップ2: バリデーション追加
```typescript
// 電話番号チェック（日本の電話番号形式）
if (phoneNumber && !/^0\d{9,10}$/.test(phoneNumber.replace(/-/g, ''))) {
  errors.phoneNumber = '正しい電話番号を入力してください（例: 090-1234-5678）';
}
```

#### ステップ3: フォームに入力フィールド追加
```tsx
<div>
  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-2">
    電話番号（任意）
  </label>
  <input
    type="tel"
    id="phoneNumber"
    value={phoneNumber}
    onChange={(e) => setPhoneNumber(e.target.value)}
    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:outline-none transition-colors"
    placeholder="090-1234-5678"
  />
  {fieldErrors.phoneNumber && (
    <p className="text-red-600 text-sm mt-1">{fieldErrors.phoneNumber}</p>
  )}
</div>
```

#### ステップ4: プロフィール保存処理に追加
サインアップ成功後、`/user/profile/setup` や初回プロフィール作成時に `ClientProfile` に保存:
```typescript
await client.models.ClientProfile.create({
  clientId: userId,
  name: fullName,
  phoneNumber: phoneNumber,
  // ...
});
```

---

### 2. 身分証明書アップロードページ

**優先度**: 高

**ファイル**: `app/instructor/identity-document/page.tsx`

**実装内容**:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getInstructor, updateInstructor } from '@/lib/api/instructors';
import { uploadToS3 } from '@/lib/storage';

export default function IdentityDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [instructor, setInstructor] = useState<any>(null);

  useEffect(() => {
    const loadInstructor = async () => {
      const session = getSession();
      if (!session) {
        router.push('/login/instructor');
        return;
      }
      const data = await getInstructor(session.userId);
      setInstructor(data);
    };
    loadInstructor();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !instructor) return;

    try {
      setUploading(true);

      // S3にアップロード
      const s3Url = await uploadToS3(file, `identity-documents/${instructor.userId}`);

      // インストラクター情報を更新
      await updateInstructor(instructor.userId, {
        identityDocumentUrl: s3Url,
        identityDocumentStatus: 'pending',
        identityDocumentSubmittedAt: new Date().toISOString(),
      });

      alert('身分証明書を提出しました。審査完了までお待ちください。');
      router.push('/instructor');
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    if (!instructor) return null;
    const status = instructor.identityDocumentStatus;
    const badges = {
      notSubmitted: { label: '未提出', color: 'bg-gray-100 text-gray-800' },
      pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
      rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status] || badges.notSubmitted;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">身分証明書の提出</h1>
        <p className="mt-2 text-gray-600">
          サービス提供を開始するには、身分証明書の提出と承認が必要です。
        </p>
      </div>

      {/* ステータス表示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">現在のステータス</h2>
        {getStatusBadge()}
        {instructor?.identityDocumentStatus === 'rejected' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">却下理由:</p>
            <p className="text-red-700 text-sm mt-1">
              {instructor.identityDocumentRejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* アップロードフォーム */}
      {instructor?.identityDocumentStatus !== 'approved' && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              身分証明書をアップロード
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="w-full"
            />
            <p className="mt-2 text-sm text-gray-500">
              運転免許証、パスポート、マイナンバーカードなど
            </p>
          </div>

          {preview && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">プレビュー:</p>
              <img src={preview} alt="プレビュー" className="max-w-full h-auto rounded-lg border" />
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {uploading ? '提出中...' : '提出する'}
          </button>
        </form>
      )}
    </div>
  );
}
```

---

### 3. 管理者用身分証明書審査ページ

**優先度**: 高

**ファイル**: `app/admin/identity-documents/page.tsx`

**実装内容**:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { listInstructors, updateInstructor } from '@/lib/api/instructors';

export default function AdminIdentityDocumentsPage() {
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingDocuments();
  }, []);

  const loadPendingDocuments = async () => {
    try {
      const allInstructors = await listInstructors();
      // pending ステータスのみ表示
      const pending = allInstructors.filter(
        (inst) => inst.identityDocumentStatus === 'pending'
      );
      setInstructors(pending);
    } catch (error) {
      console.error('読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (instructorId: string) => {
    try {
      await updateInstructor(instructorId, {
        identityDocumentStatus: 'approved',
        identityDocumentApprovedAt: new Date().toISOString(),
      });
      alert('承認しました');
      loadPendingDocuments();
    } catch (error) {
      console.error('承認エラー:', error);
      alert('承認に失敗しました');
    }
  };

  const handleReject = async (instructorId: string) => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください');
      return;
    }
    try {
      await updateInstructor(instructorId, {
        identityDocumentStatus: 'rejected',
        identityDocumentRejectionReason: rejectionReason,
      });
      alert('却下しました');
      setRejectionReason('');
      setSelectedInstructor(null);
      loadPendingDocuments();
    } catch (error) {
      console.error('却下エラー:', error);
      alert('却下に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">身分証明書審査</h1>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : instructors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">審査待ちの書類はありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {instructors.map((instructor) => (
            <div key={instructor.userId} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {instructor.displayName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    提出日: {new Date(instructor.identityDocumentSubmittedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>

              {/* 画像プレビュー */}
              <div className="mb-4">
                <img
                  src={instructor.identityDocumentUrl}
                  alt="身分証明書"
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>

              {/* アクションボタン */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleApprove(instructor.userId)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  承認する
                </button>
                <button
                  onClick={() => setSelectedInstructor(instructor)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  却下する
                </button>
              </div>

              {/* 却下理由入力モーダル */}
              {selectedInstructor?.userId === instructor.userId && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="却下理由を入力してください"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReject(instructor.userId)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => {
                        setSelectedInstructor(null);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
```

---

### 4. 機能制限の実装

**優先度**: 高

**対象**: インストラクターダッシュボード

**実装内容**:

`app/instructor/(protected)/page.tsx` の冒頭に以下を追加:

```tsx
useEffect(() => {
  const checkIdentityStatus = async () => {
    const session = getSession();
    if (!session) return;

    const instructor = await getInstructor(session.userId);
    if (instructor.identityDocumentStatus !== 'approved') {
      // 機能制限バナー表示
      setShowIdentityWarning(true);
    }
  };
  checkIdentityStatus();
}, []);

// バナー表示
{showIdentityWarning && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
    <div className="flex">
      <div className="flex-1">
        <p className="text-sm text-yellow-700">
          <strong>身分証明書の提出が必要です。</strong>
          承認されるまで、サービス作成と予約受付ができません。
        </p>
      </div>
      <button
        onClick={() => router.push('/instructor/identity-document')}
        className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
      >
        提出する
      </button>
    </div>
  </div>
)}
```

サービス作成ページ (`/instructor/services/new`) では:

```tsx
useEffect(() => {
  const checkPermission = async () => {
    const session = getSession();
    const instructor = await getInstructor(session.userId);
    if (instructor.identityDocumentStatus !== 'approved') {
      alert('サービスを作成するには身分証明書の承認が必要です');
      router.push('/instructor/identity-document');
    }
  };
  checkPermission();
}, [router]);
```

---

### 5. 重複登録防止機能

**優先度**: 中

**実装内容**:

#### lib/api/profile.ts に追加:

```typescript
/**
 * 電話番号の重複チェック
 */
export async function checkDuplicatePhoneNumber(phoneNumber: string): Promise<boolean> {
  const client = generateClient<Schema>();
  try {
    const { data } = await client.models.ClientProfile.list({
      filter: { phoneNumber: { eq: phoneNumber } }
    });
    return (data || []).length > 0;
  } catch (error) {
    console.error('電話番号重複チェックエラー:', error);
    return false;
  }
}
```

#### サインアップページで使用:

```typescript
// バリデーション内
if (phoneNumber) {
  const isDuplicate = await checkDuplicatePhoneNumber(phoneNumber);
  if (isDuplicate) {
    errors.phoneNumber = 'この電話番号は既に登録されています';
  }
}
```

---

### 6. メールアドレス変更ページ

**優先度**: 中

**ファイル**: `app/user/settings/email/page.tsx`

**実装内容**:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserAttribute, confirmUserAttribute, signIn } from 'aws-amplify/auth';
import { getSession } from '@/lib/auth';
import { updateClientProfile } from '@/lib/api/profile';

export default function EmailChangePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = getSession();
      if (!session) {
        router.push('/login/user');
        return;
      }

      // Step 1: パスワード確認
      await signIn({ username: session.email, password: currentPassword });

      // Step 2: メールアドレス変更リクエスト
      await updateUserAttribute({
        userAttribute: {
          attributeKey: 'email',
          value: newEmail
        }
      });

      setStep('verify');
      alert('新しいメールアドレスに認証コードを送信しました');
    } catch (err: any) {
      console.error('メールアドレス変更エラー:', err);
      setError(err.message || 'メールアドレス変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const session = getSession();
      if (!session) return;

      // Step 3: 認証コード確認
      await confirmUserAttribute({
        userAttributeKey: 'email',
        confirmationCode: verificationCode
      });

      // Step 4: ClientProfile更新
      await updateClientProfile(session.userId, { email: newEmail });

      alert('メールアドレスを変更しました');
      router.push('/user/settings');
    } catch (err: any) {
      console.error('認証コード確認エラー:', err);
      setError(err.message || '認証コードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">メールアドレス変更</h1>

      {step === 'input' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現在のパスワード
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新しいメールアドレス
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
          >
            {loading ? '処理中...' : '認証コードを送信'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="bg-white rounded-lg shadow p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {newEmail} 宛に認証コードを送信しました
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              認証コード
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="6桁のコード"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
          >
            {loading ? '確認中...' : '確認する'}
          </button>
        </form>
      )}
    </div>
  );
}
```

---

### 7. テーマカラー選択機能

**優先度**: 中

**ファイル**: `app/user/settings/theme/page.tsx`

**実装内容**:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getSession } from '@/lib/auth';
import { getClientProfile, updateClientProfile } from '@/lib/api/profile';
import { Check } from 'lucide-react';

const themeOptions = [
  { value: 'purple', label: 'パープル', gradient: 'from-purple-600 to-pink-600', hex: '#9333EA' },
  { value: 'blue', label: 'ブルー', gradient: 'from-blue-600 to-cyan-600', hex: '#2563EB' },
  { value: 'green', label: 'グリーン', gradient: 'from-green-600 to-emerald-600', hex: '#16A34A' },
  { value: 'orange', label: 'オレンジ', gradient: 'from-orange-600 to-red-600', hex: '#EA580C' },
  { value: 'pink', label: 'ピンク', gradient: 'from-pink-600 to-rose-600', hex: '#DB2777' },
];

export default function ThemeSettingsPage() {
  const [selectedTheme, setSelectedTheme] = useState('purple');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const session = getSession();
      if (!session) return;

      const profile = await getClientProfile(session.userId);
      if (profile?.themeColor) {
        setSelectedTheme(profile.themeColor);
      }
      setLoading(false);
    };
    loadTheme();
  }, []);

  const handleSave = async () => {
    const session = getSession();
    if (!session) return;

    setSaving(true);
    try {
      await updateClientProfile(session.userId, { themeColor: selectedTheme });
      alert('テーマカラーを変更しました。ページをリロードすると反映されます。');
      window.location.reload();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">テーマカラー設定</h1>
        <p className="mt-2 text-gray-600">
          ダッシュボードの配色を変更できます
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {themeOptions.map((theme) => (
            <button
              key={theme.value}
              onClick={() => setSelectedTheme(theme.value)}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                selectedTheme === theme.value
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-full h-24 rounded-lg bg-gradient-to-r ${theme.gradient} mb-3`} />
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{theme.label}</span>
                {selectedTheme === theme.value && (
                  <Check className="w-5 h-5 text-gray-900" />
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
```

---

### 8. 電話番号SMS認証（将来実装）

**優先度**: 低（後回し）

**設計**:

#### Cognitoの設定変更
1. AWS Cognito User Pool で `phone_number` 属性を追加
2. SMS設定を有効化（SNS経由）
3. 多要素認証（MFA）を設定

#### フロント実装
1. サインアップページに「メール / 電話番号」タブ切り替え追加
2. 電話番号入力フィールド（国番号選択 + 番号）
3. SMS認証コード入力画面

#### 実装例:
```typescript
// 電話番号でのサインアップ
await signUp({
  username: phoneNumber,
  password,
  options: {
    userAttributes: {
      phone_number: phoneNumber,
      'custom:role': 'user',
    },
  },
});

// SMS認証コード確認
await confirmSignUp({
  username: phoneNumber,
  confirmationCode: code,
});
```

---

## 注意事項

- 身分証明書のS3アップロード機能は別途 `lib/storage.ts` に実装が必要です
- 管理者権限のチェックは `middleware.ts` または保護レイアウトで実装してください
- テーマカラーの適用は、各コンポーネントで `ClientProfile.themeColor` を読み込んで動的にクラス名を変更する必要があります
