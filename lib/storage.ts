/**
 * AWS S3 ストレージ操作
 */

import { uploadData, getUrl, remove } from 'aws-amplify/storage';

/**
 * S3にファイルをアップロード
 * @param file アップロードするファイル
 * @param path S3内のパス（例: 'identity-documents/userId/filename.jpg'）
 * @returns アップロードされたファイルのURL
 */
export async function uploadToS3(file: File, path: string): Promise<string> {
  try {
    // ファイル名にタイムスタンプを追加してユニークにする
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const s3Path = `${path}/${timestamp}.${fileExtension}`;

    console.log('📤 S3アップロード開始:', s3Path);

    // S3にアップロード
    const result = await uploadData({
      path: s3Path,
      data: file,
      options: {
        contentType: file.type,
      },
    }).result;

    console.log('✅ S3アップロード成功:', result);

    // アップロードしたファイルのURLを取得
    const urlResult = await getUrl({
      path: s3Path,
    });

    return urlResult.url.toString();
  } catch (error) {
    console.error('❌ S3アップロードエラー:', error);
    throw new Error('ファイルのアップロードに失敗しました');
  }
}

/**
 * S3からファイルのURLを取得
 * @param path S3内のパス
 * @returns ファイルのURL
 */
export async function getFileUrl(path: string): Promise<string> {
  try {
    const urlResult = await getUrl({
      path,
    });

    return urlResult.url.toString();
  } catch (error) {
    console.error('❌ S3 URL取得エラー:', error);
    throw new Error('ファイルURLの取得に失敗しました');
  }
}

/**
 * S3からファイルを削除
 * @param path S3内のパス
 */
export async function deleteFromS3(path: string): Promise<void> {
  try {
    await remove({
      path,
    });

    console.log('✅ S3ファイル削除成功:', path);
  } catch (error) {
    console.error('❌ S3削除エラー:', error);
    throw new Error('ファイルの削除に失敗しました');
  }
}
