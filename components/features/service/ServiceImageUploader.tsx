'use client';

import { useState, useRef } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ExistingImage {
  id: string;
  url: string;
  sortOrder: number;
}

interface ServiceImageUploaderProps {
  serviceId?: string;
  existingImages?: ExistingImage[];
  onImagesChange?: (files: File[]) => void;
  onImageDeleted?: (imageId: string) => void;
}

export function ServiceImageUploader({
  serviceId,
  existingImages = [],
  onImagesChange,
  onImageDeleted,
}: ServiceImageUploaderProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ExistingImage[]>(existingImages);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalImages = uploadedImages.length + pendingFiles.length;
  const maxImages = 5;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError('');

    const remaining = maxImages - totalImages;
    if (files.length > remaining) {
      setError(`あと${remaining}枚まで追加できます`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        continue;
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('JPEG、PNG、WebPのみ対応しています');
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      const updated = [...pendingFiles, ...validFiles];
      setPendingFiles(updated);
      setPreviews([...previews, ...newPreviews]);
      onImagesChange?.(updated);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const updatedFiles = pendingFiles.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPendingFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onImagesChange?.(updatedFiles);
  };

  const deleteUploadedImage = async (imageId: string) => {
    if (!serviceId) return;

    try {
      setUploading(true);
      const res = await fetch(`/api/services/${serviceId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
      onImageDeleted?.(imageId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadPendingFiles = async () => {
    if (!serviceId || pendingFiles.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const newImages: ExistingImage[] = [];
      const startOrder = uploadedImages.length;

      for (let i = 0; i < pendingFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', pendingFiles[i]);
        formData.append('sortOrder', String(startOrder + i));

        const res = await fetch(`/api/services/${serviceId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'アップロードに失敗しました');
        }

        const image = await res.json();
        newImages.push(image);
      }

      setUploadedImages([...uploadedImages, ...newImages]);
      setPendingFiles([]);
      previews.forEach((p) => URL.revokeObjectURL(p));
      setPreviews([]);
      onImagesChange?.([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-gray-700">
        サービス画像（最大5枚）
      </label>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* 画像グリッド */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* アップロード済み画像 */}
        {uploadedImages.map((img, index) => (
          <div
            key={img.id}
            className={`relative rounded-lg overflow-hidden border-2 ${
              index === 0 ? 'border-purple-300 col-span-2 row-span-2 md:col-span-2 md:row-span-2' : 'border-gray-200'
            }`}
          >
            <img
              src={img.url}
              alt={`サービス画像 ${index + 1}`}
              className={`w-full object-cover ${index === 0 ? 'h-48 md:h-full' : 'h-24 md:h-28'}`}
            />
            {index === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded">
                メイン
              </span>
            )}
            <button
              type="button"
              onClick={() => deleteUploadedImage(img.id)}
              disabled={uploading}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* プレビュー（未アップロード） */}
        {previews.map((preview, index) => (
          <div
            key={`preview-${index}`}
            className={`relative rounded-lg overflow-hidden border-2 border-dashed border-blue-300 ${
              uploadedImages.length === 0 && index === 0 ? 'col-span-2 row-span-2 md:col-span-2 md:row-span-2' : ''
            }`}
          >
            <img
              src={preview}
              alt={`プレビュー ${index + 1}`}
              className={`w-full object-cover ${
                uploadedImages.length === 0 && index === 0 ? 'h-48 md:h-full' : 'h-24 md:h-28'
              }`}
            />
            {uploadedImages.length === 0 && index === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">
                メイン
              </span>
            )}
            <button
              type="button"
              onClick={() => removePendingFile(index)}
              className="absolute top-1 right-1 p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 shadow"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* 追加ボタン */}
        {totalImages < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-24 md:h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-purple-400 hover:text-purple-500 transition-colors"
          >
            <Upload className="h-6 w-6 mb-1" />
            <span className="text-xs">追加</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* serviceId がある場合はアップロードボタン表示 */}
      {serviceId && pendingFiles.length > 0 && (
        <button
          type="button"
          onClick={uploadPendingFiles}
          disabled={uploading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {uploading ? 'アップロード中...' : `${pendingFiles.length}枚をアップロード`}
        </button>
      )}

      <p className="text-xs text-gray-500">
        <ImageIcon className="inline h-3 w-3 mr-1" />
        JPEG、PNG、WebP形式、各5MB以下。1枚目がメイン画像として表示されます。
      </p>
    </div>
  );
}
