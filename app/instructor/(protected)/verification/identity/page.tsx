/**
 * 本人確認書類提出ページ（インストラクター用）
 * ユーザー版と同等機能。ステータス取得時にプロフィールが無い場合は自動作成。
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Upload, X } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { updateClientProfile } from '@/lib/api/profile-client';

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

export default function InstructorIdentityVerificationPage() {
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
  const [initialProfile, setInitialProfile] = useState<{ fullName: string; dateOfBirth: string; address: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // カメラ関連
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'front' | 'back' | 'additional'>('front');
  const [additionalCameraIndex, setAdditionalCameraIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await getSession();
        if (!session?.user) {
          router.push('/login/instructor');
          return;
        }
        await loadStatus();
      } catch (err) {
        console.error('初期化エラー:', err);
        router.push('/login/instructor');
      }
    };
    run();
    return () => stopCamera();
  }, [router]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }
      const userName = session.user.user_metadata?.name || session.user.user_metadata?.full_name || '';

      const response = await fetch('/api/verification/identity/status?role=instructor', { credentials: 'include' });

      if (response.status === 401 || response.status === 403) {
        router.push('/login/instructor');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load status');
      }

      const data = await response.json();
      setStatus(data);

      if (data.profile) {
        // dateOfBirth の処理
        let dateOfBirthStr = '';
        if (data.profile.dateOfBirth) {
          try {
            const date = typeof data.profile.dateOfBirth === 'string'
              ? new Date(data.profile.dateOfBirth)
              : data.profile.dateOfBirth;
            if (date instanceof Date && !isNaN(date.getTime())) {
              dateOfBirthStr = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('[instructor-identity] Date parsing error:', e, data.profile.dateOfBirth);
          }
        }

        const initial = {
          fullName: data.profile.fullName || '',
          dateOfBirth: dateOfBirthStr,
          address: data.profile.address || '',
        };

        setFullName(initial.fullName || userName || '');
        setDateOfBirth(initial.dateOfBirth);
        setAddress(initial.address);
        setInitialProfile({
          fullName: initial.fullName || userName || '',
          dateOfBirth: initial.dateOfBirth,
          address: initial.address,
        });
      }

    } catch (err) {
      console.error('Load status error:', err);
      // エラー発生時も認証状態を確認
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }
      setError('ステータスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('画像ファイル（JPEG, PNG）をアップロードしてください');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'front') {
        setFrontFile(file);
        setFrontPreview(dataUrl);
      } else {
        setBackFile(file);
        setBackPreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('追加画像は10MB以下にしてください');
      return;
    }
    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setError('追加画像はJPEG/PNGのみアップロードできます');
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

  const removeAdditionalAt = (index: number) => {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
    setAdditionalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const getVisibleAdditionalSlots = () => {
    const count = additionalFiles.length;
    // 最初は1枠のみ、追加されるたびに次の枠が表示（最大5枠）
    return Math.min(count + 1, 5);
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    resetMessages();

    if (!frontFile) {
      setError('表面の画像をアップロードしてください');
      return;
    }
    if (documentType === 'license' && !backFile) {
      setError('運転免許証の場合は裏面画像が必須です');
      return;
    }
    if (!fullName || !dateOfBirth || !address) {
      setError('氏名・生年月日・住所は必須です');
      return;
    }

    setSubmitting(true);

    const readFileAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    try {
      const frontBase64 = await readFileAsDataUrl(frontFile);
      const backBase64 = backFile ? await readFileAsDataUrl(backFile) : null;
      const additionalBase64 = await Promise.all(additionalFiles.map((f) => readFileAsDataUrl(f)));

      // プロフィール情報が変わっていればユーザーに確認し、更新を実施
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }

      if (
        initialProfile &&
        (initialProfile.fullName !== fullName ||
          initialProfile.dateOfBirth !== dateOfBirth ||
          initialProfile.address !== address)
      ) {
        const confirmUpdate = window.confirm('氏名・生年月日・住所をプロフィールにも反映しますか？');
        if (confirmUpdate) {
          await updateClientProfile(session.user.id, {
            fullName,
            dateOfBirth,
            address,
            isProfileComplete: false,
          });
          setInitialProfile({ fullName, dateOfBirth, address });
        }
      }

      const response = await fetch('/api/verification/identity/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentType,
          documentFrontUrl: frontBase64,
          documentBackUrl: backBase64,
          additionalImages: additionalBase64,
          fullName,
          dateOfBirth,
          address,
          role: 'instructor', // インストラクター用の本人確認
        }),
      });

      // 認証エラー時は即座にリダイレクト
      if (response.status === 401 || response.status === 403) {
        router.push('/login/instructor');
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '書類の提出に失敗しました');
      }

      setSuccess(data.message || '本人確認書類を提出しました');
      await loadStatus();
    } catch (err: any) {
      console.error('Submit error:', err);
      // エラー発生時も認証状態を確認
      const session = await getSession();
      if (!session?.user) {
        router.push('/login/instructor');
        return;
      }
      setError(err.message || '提出に失敗しました');
    } finally {
      setSubmitting(false);
    }
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

  const identityRequest = status?.request;
  const isPending = identityRequest?.status === 'pending';
  const isRejected = identityRequest?.status === 'rejected';
  const isApproved = identityRequest?.status === 'approved' || status?.identityVerified;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">本人確認（インストラクター）</h1>
        <p className="text-gray-600">
          サービス提供には本人確認が必要です。書類の表・裏と補足写真を提出してください。
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* ステータス表示 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700">
            現在のステータス: {identityRequest?.status ? identityRequest.status : '未提出'}
          </span>
          {isApproved && (
            <span className="px-3 py-1 text-sm rounded-full bg-green-50 text-green-700">
              承認済み
            </span>
          )}
          {isPending && (
            <span className="px-3 py-1 text-sm rounded-full bg-yellow-50 text-yellow-800">
              審査中
            </span>
          )}
          {isRejected && (
            <span className="px-3 py-1 text-sm rounded-full bg-red-50 text-red-700">
              再提出が必要です
            </span>
          )}
        </div>
        {isRejected && identityRequest?.rejectedReason && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-semibold">却下理由</p>
            <p className="text-sm text-red-700 mt-1">{identityRequest.rejectedReason}</p>
            <p className="text-sm text-gray-700 mt-2">
              再提出が必要です。正しい書類をアップロードしてください。
            </p>
          </div>
        )}
      </div>

      {/* カメラモーダル */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                カメラで撮影 ({cameraTarget === 'front' ? '表面' : cameraTarget === 'back' ? '裏面' : '補足'})
              </h3>
              <button onClick={stopCamera} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <video ref={videoRef} className="w-full rounded-lg bg-black" autoPlay playsInline />
              </div>
              <div className="space-y-3">
                <canvas ref={canvasRef} className="hidden" />
                <button
                  onClick={capturePhoto}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  撮影する
                </button>
                <p className="text-xs text-gray-500">
                  カメラが映らない場合はブラウザのカメラアクセス許可を確認してください。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 申請フォーム */}
      {!isApproved && (
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 書類タイプ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                書類タイプ
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="license">運転免許証（表・裏）</option>
                <option value="mynumber">マイナンバーカード（表）</option>
                <option value="passport">パスポート</option>
                <option value="other">その他（住民票＋銀行口座など）</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                ※ 運転免許証やマイナンバーカードをお持ちでない方は、住民票＋銀行口座の写しなど複数書類での本人確認が可能です。「その他」を選択し、補足写真に必要な書類をアップロードしてください。
              </p>
            </div>

            {/* 画像アップロード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  表面の画像 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400">
                    <Upload className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">クリックしてアップロード</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'front')}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => startCamera('front')}
                    className="px-3 py-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    <Camera className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                {frontPreview && (
                  <img src={frontPreview} alt="表面プレビュー" className="rounded-lg border" />
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  裏面の画像 {documentType === 'license' && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400">
                    <Upload className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-600">クリックしてアップロード</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'back')}
                      disabled={documentType !== 'license'}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => startCamera('back')}
                    className="px-3 py-3 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={documentType !== 'license'}
                  >
                    <Camera className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                {backPreview && (
                  <img src={backPreview} alt="裏面プレビュー" className="rounded-lg border" />
                )}
              </div>
            </div>

            {/* 補足画像 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                補足写真（任意・最大5枚）
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: getVisibleAdditionalSlots() }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-xs text-gray-500">補足{idx + 1}</p>
                    {additionalPreviews[idx] ? (
                      <div className="relative group">
                        <img
                          src={additionalPreviews[idx]}
                          alt={`追加画像${idx + 1}`}
                          className="rounded-lg border w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => removeAdditionalAt(idx)}
                        >
                          <X className="w-4 h-4 text-gray-700" />
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
                            accept="image/*"
                            onChange={(e) => handleAdditionalFileChange(e, idx)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAdditionalCameraIndex(idx);
                            startCamera('additional');
                          }}
                          className="px-2 py-1 bg-gray-100 rounded text-xs flex items-center justify-center gap-1 hover:bg-gray-200"
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

            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  氏名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  生年月日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                placeholder="例: 東京都渋谷区渋谷1-2-3"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
            >
              {submitting ? '提出中...' : '本人確認書類を提出する'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
