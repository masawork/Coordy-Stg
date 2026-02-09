/**
 * 本人確認書類提出ページ（ユーザー用）
 * カメラキャプチャ対応、複数画像添付対応
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, X } from 'lucide-react';

interface VerificationStatus {
  verificationLevel: number;
  identityVerified: boolean;
  profile?: {
    fullName: string | null;
    dateOfBirth: string | null;
    address: string | null;
  };
  request: {
    id: string;
    status: string;
    documentType: string;
    submittedAt: string;
    rejectedReason: string | null;
  } | null;
}

export default function IdentityVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // フォーム入力
  const [documentType, setDocumentType] = useState<string>('license');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // カメラ関連
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'front' | 'back' | 'additional'>('front');
  const [additionalCameraIndex, setAdditionalCameraIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadStatus();
    // クリーンアップ時にカメラを停止
    return () => {
      stopCamera();
    };
  }, []);

  // カメラを開始
  const startCamera = async (target: 'front' | 'back' | 'additional') => {
    try {
      setCameraTarget(target);
      setShowCamera(true);
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('カメラへのアクセスが拒否されました。設定を確認してください。');
      setShowCamera(false);
    }
  };

  // カメラを停止
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // 写真を撮影
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // キャンバスのサイズをビデオに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Base64画像として取得
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // ファイルオブジェクトを作成
    fetch(imageDataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `capture_${cameraTarget}_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        if (cameraTarget === 'front') {
          setFrontFile(file);
          setFrontPreview(imageDataUrl);
        } else if (cameraTarget === 'back') {
          setBackFile(file);
          setBackPreview(imageDataUrl);
        } else {
          // 追加画像の場合は指定されたインデックスに保存
          setAdditionalFiles((prev) => {
            const next = [...prev];
            next[additionalCameraIndex] = file;
            return next;
          });
          setAdditionalPreviews((prev) => {
            const next = [...prev];
            next[additionalCameraIndex] = imageDataUrl;
            return next;
          });
        }

        stopCamera();
      });
  };

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/verification/identity/status?role=user');
      if (!response.ok) {
        throw new Error('Failed to load status');
      }
      const data = await response.json();
      setStatus(data);

      // プロフィールデータで自動入力
      if (data.profile) {
        if (data.profile.fullName) {
          setFullName(data.profile.fullName);
        }
        if (data.profile.dateOfBirth) {
          // ISO日付文字列からYYYY-MM-DD形式に変換
          const dateStr = new Date(data.profile.dateOfBirth).toISOString().split('T')[0];
          setDateOfBirth(dateStr);
        }
        if (data.profile.address) {
          setAddress(data.profile.address);
        }
      }
    } catch (err) {
      console.error('Load status error:', err);
      setError('ステータスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('画像ファイル（JPEG, PNG）をアップロードしてください');
      return;
    }

    if (type === 'front') {
      setFrontFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFrontPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setBackFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBackPreview(reader.result as string);
      reader.readAsDataURL(file);
    }

    setError('');
  };

  const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('補足画像のファイルサイズは10MB以下にしてください');
      return;
    }
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('補足画像は JPEG/PNG のみアップロードできます');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAdditionalFiles((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      setAdditionalPreviews((prev) => {
        const next = [...prev];
        next[index] = dataUrl;
        return next;
      });
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const getVisibleAdditionalSlots = () => {
    const count = additionalFiles.length;
    // 最初は1枠のみ、追加されるたびに次の枠が表示（最大5枠）
    return Math.min(count + 1, 5);
  };

  const removeAdditionalAt = (index: number) => {
    const nextFiles = additionalFiles.filter((_, i) => i !== index);
    const nextPreviews = additionalPreviews.filter((_, i) => i !== index);
    setAdditionalFiles(nextFiles);
    setAdditionalPreviews(nextPreviews);
  };

  const uploadImage = async (file: File): Promise<string> => {
    // 本番環境では S3 や Cloudinary にアップロードする
    // ここでは Base64 エンコードで仮実装
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // バリデーション
    if (!frontFile) {
      setError('書類の表面画像をアップロードしてください');
      return;
    }

    if (documentType === 'license' && !backFile) {
      setError('運転免許証の場合は裏面画像も必要です');
      return;
    }

    if (!fullName || !dateOfBirth || !address) {
      setError('すべての項目を入力してください');
      return;
    }

    try {
      setSubmitting(true);

      // 画像アップロード
      const frontUrl = await uploadImage(frontFile);
      const backUrl = backFile ? await uploadImage(backFile) : null;
      const additionalUrls = additionalFiles.length
        ? await Promise.all(additionalFiles.map((file) => uploadImage(file)))
        : [];

      // API呼び出し
      const response = await fetch('/api/verification/identity/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentFrontUrl: frontUrl,
          documentBackUrl: backUrl,
          fullName,
          dateOfBirth,
          address,
          additionalImages: additionalUrls,
          role: 'user', // ユーザー用の本人確認
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 詳細なエラーメッセージを構築
        let errorMsg = errorData.error || '提出に失敗しました';
        if (errorData.details) {
          errorMsg += `\n詳細: ${errorData.details}`;
        }
        if (errorData.code) {
          errorMsg += `\n(エラーコード: ${errorData.code})`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setSuccess(data.message);

      // 3秒後にプロフィールにリダイレクト
      setTimeout(() => {
        router.push('/user/profile');
      }, 3000);
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || '本人確認書類の提出に失敗しました');
    } finally {
      setSubmitting(false);
    }
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

  // 既に承認済み
  if (status?.identityVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            本人確認が完了しています
          </h1>
          <p className="text-gray-600 mb-6">
            すべての機能をご利用いただけます
          </p>
          <button
            onClick={() => router.push('/user/profile')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            プロフィールに戻る
          </button>
        </div>
      </div>
    );
  }

  const isPending = status?.request?.status === 'pending';
  const needsRevision = status?.request?.status === 'revision_required';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📄 本人確認書類の提出
        </h1>
        <p className="text-gray-600 mb-6">
          本人確認書類を提出すると、認証レベルが Level 2 にアップグレードされます
        </p>

        {/* 審査中の注意表示（再提出可） */}
        {isPending && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-yellow-800 font-semibold mb-2">現在、審査中です</h3>
            <p className="text-sm text-yellow-800">
              書類を差し替えて再提出できます。再提出するとステータスは再度「審査中」になります。
            </p>
            {status?.request?.submittedAt && (
              <p className="text-xs text-yellow-700 mt-2">
                前回提出: {new Date(status.request.submittedAt).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}

        {/* 却下理由の表示 */}
        {(status?.request?.status === 'rejected' || needsRevision) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">
              ⚠️ {needsRevision ? '修正のお願いがあります' : '前回の申請が却下されました'}
            </h3>
            <p className="text-sm text-red-700">
              {status?.request?.rejectedReason}
            </p>
            <p className="text-xs text-red-600 mt-2">
              書類を再撮影の上、再度提出してください。
            </p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* 成功メッセージ */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 書類種類 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              書類の種類
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="license">運転免許証</option>
              <option value="mynumber">マイナンバーカード</option>
              <option value="passport">パスポート</option>
              <option value="other">その他（住民票＋銀行口座など）</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              ※ 運転免許証やマイナンバーカードをお持ちでない方は、住民票＋銀行口座の写しなど複数書類での本人確認が可能です。「その他」を選択し、補足写真に必要な書類をアップロードしてください。
            </p>
          </div>

          {/* 表面画像 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              書類の表面 <span className="text-red-500">*</span>
            </label>
            {frontPreview ? (
              <div className="border-2 border-gray-300 rounded-lg p-4">
                <img src={frontPreview} alt="表面" className="max-h-64 mx-auto rounded" />
                <button
                  type="button"
                  onClick={() => {
                    setFrontFile(null);
                    setFrontPreview(null);
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 mx-auto"
                >
                  <X className="w-4 h-4" /> 削除
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {/* カメラで撮影 */}
                  <button
                    type="button"
                    onClick={() => startCamera('front')}
                    className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="font-semibold">カメラで撮影</span>
                  </button>
                  {/* ファイル選択 */}
                  <div>
                    <input
                      type="file"
                      id="front-upload"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => handleFileChange(e, 'front')}
                      className="hidden"
                    />
                    <label
                      htmlFor="front-upload"
                      className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="font-semibold">ファイルを選択</span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  JPEG/PNG形式、10MB以下
                </p>
              </div>
            )}
          </div>

          {/* 裏面画像（すべての書類タイプで利用可能、運転免許証は必須） */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              書類の裏面{' '}
              {documentType === 'license' ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-500 text-xs">（任意）</span>
              )}
            </label>
            {backPreview ? (
              <div className="border-2 border-gray-300 rounded-lg p-4">
                <img src={backPreview} alt="裏面" className="max-h-64 mx-auto rounded" />
                <button
                  type="button"
                  onClick={() => {
                    setBackFile(null);
                    setBackPreview(null);
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 flex items-center gap-1 mx-auto"
                >
                  <X className="w-4 h-4" /> 削除
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {/* カメラで撮影 */}
                  <button
                    type="button"
                    onClick={() => startCamera('back')}
                    className="flex items-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="font-semibold">カメラで撮影</span>
                  </button>
                  {/* ファイル選択 */}
                  <div>
                    <input
                      type="file"
                      id="back-upload"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={(e) => handleFileChange(e, 'back')}
                      className="hidden"
                    />
                    <label
                      htmlFor="back-upload"
                      className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="font-semibold">ファイルを選択</span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  {documentType === 'license'
                    ? '運転免許証は裏面が必須です'
                    : '住所変更等がある場合は裏面も添付してください'}
                </p>
              </div>
            )}
          </div>

          {/* 追加の補足写真（任意・最大5枚） */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              補足写真（任意・最大5枚）
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: getVisibleAdditionalSlots() }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-xs text-gray-500">補足{idx + 1}</p>
                  {additionalPreviews[idx] ? (
                    <div className="relative group border rounded-lg p-2">
                      <img
                        src={additionalPreviews[idx]}
                        alt={`補足 ${idx + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdditionalAt(idx)}
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400">
                        <div className="text-center">
                          <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                          <span className="text-xs text-gray-500">選択</span>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => handleAdditionalFileChange(e, idx)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalCameraIndex(idx);
                          startCamera('additional');
                        }}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center justify-center gap-1 hover:bg-purple-200"
                      >
                        <Camera className="w-3 h-3" />
                        撮影
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 氏名 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              氏名（書類に記載の通り） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="山田 太郎"
            />
          </div>

          {/* 生年月日 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              生年月日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 住所 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              住所 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="東京都渋谷区..."
            />
          </div>

          {/* 注意事項 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">
              ⚠️ 注意事項
            </h3>
            <ul className="text-xs text-yellow-800 space-y-1">
              <li>• 書類全体が鮮明に写っていることを確認してください</li>
              <li>• 氏名、生年月日、住所が読み取れることを確認してください</li>
              <li>• 光の反射や影がないように撮影してください</li>
              <li>• 審査には1〜3営業日かかります</li>
            </ul>
          </div>

          {/* セキュリティ対策の説明 */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              🔒 セキュリティについて
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 提出された書類は暗号化して安全に保管されます</li>
              <li>• 本人確認目的以外には使用しません</li>
              <li>• 審査完了後、一定期間経過で自動削除されます</li>
            </ul>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold"
          >
            {submitting ? '送信中...' : '本人確認書類を提出'}
          </button>
        </form>
      </div>

      {/* カメラモーダル */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📷 {cameraTarget === 'front' ? '表面' : '裏面'}を撮影
              </h3>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-96 object-contain"
              />
              <div className="absolute inset-0 border-4 border-dashed border-white/30 m-4 rounded-lg pointer-events-none" />
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                撮影する
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              書類が枠内に収まるように調整してください
            </p>
          </div>
        </div>
      )}

      {/* 非表示のCanvas（撮影用） */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
