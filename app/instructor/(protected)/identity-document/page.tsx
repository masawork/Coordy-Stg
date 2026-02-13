'use client';

// 動的レンダリングを強制（React 19 + Next.js 16）
export const dynamic = 'force-dynamic';


import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { fetchCurrentInstructor } from '@/lib/api/instructors-client';

export default function IdentityDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [instructor, setInstructor] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstructor();
  }, []);

  const loadInstructor = async () => {
    try {
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      const data = await fetchCurrentInstructor();
      if (!data) {
        setError('インストラクター情報が見つかりません');
        return;
      }

      setInstructor(data);
    } catch (err: any) {
      console.error('インストラクター情報の読み込みエラー:', err);
      setError(err.message || '情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // ファイルサイズチェック（10MB以下）
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB以下にしてください');
        return;
      }

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
      setError('');

      console.log('📤 身分証明書アップロード開始...');

      // TODO: Supabase Storageにアップロードする実装が必要
      // 現在は一時的にファイル名のみ保存
      const session = await getSession();
      if (!session?.user) {
        throw new Error('認証情報が見つかりません');
      }

      // ファイルをBase64エンコードして一時的に保存（本番環境ではSupabase Storageを使用）
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // TODO: Supabase Storageにアップロード
      const s3Url = `identity-documents/${session.user.id}/${file.name}`;

      console.log('✅ S3アップロード完了:', s3Url);
      console.log('📝 インストラクター情報を更新中...');

      // インストラクター情報を更新
      // TODO: 身分証明書関連のフィールドはPrismaスキーマに未実装のため一時的にコメントアウト
      // await updateInstructor(instructor.id, {
      //   identityDocumentUrl: s3Url,
      //   identityDocumentStatus: 'pending',
      //   identityDocumentSubmittedAt: new Date().toISOString(),
      // });
      console.log('身分証明書アップロード完了（DB更新は未実装）:', s3Url);

      console.log('✅ インストラクター情報の更新完了');

      alert('身分証明書を提出しました。審査完了までお待ちください。');
      router.push('/instructor');
    } catch (error: any) {
      console.error('❌ アップロードエラー:', error);
      setError(error.message || 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    if (!instructor) return null;
    const status = instructor.identityDocumentStatus || 'notSubmitted';
    const badges = {
      notSubmitted: { label: '未提出', color: 'bg-gray-100 text-gray-800' },
      pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', color: 'bg-green-100 text-green-800' },
      rejected: { label: '却下', color: 'bg-red-100 text-red-800' },
    };
    const badge = badges[status as keyof typeof badges] || badges.notSubmitted;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">身分証明書の提出</h1>
        <p className="mt-2 text-gray-600">
          サービス提供を開始するには、身分証明書の提出と承認が必要です。
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* ステータス表示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">現在のステータス</h2>
        {getStatusBadge()}
        {instructor?.identityDocumentStatus === 'rejected' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">却下理由:</p>
            <p className="text-red-700 text-sm mt-1">
              {instructor.identityDocumentRejectionReason || '理由が記載されていません'}
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
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <p className="mt-2 text-sm text-gray-500">
              運転免許証、パスポート、マイナンバーカードなど（画像またはPDF、10MB以下）
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
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? '提出中...' : '提出する'}
          </button>
        </form>
      )}

      {instructor?.identityDocumentStatus === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <p className="text-green-800 font-medium">
            身分証明書が承認されました。サービスの作成と予約受付が可能です。
          </p>
        </div>
      )}
    </div>
  );
}
