// lib/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * 暗号化キーを取得
 * 環境変数 ENCRYPTION_KEY が必須
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Base64デコードしてBufferに変換
  return Buffer.from(key, 'base64');
}

/**
 * 文字列を暗号化
 * @param text 暗号化する文字列
 * @returns 暗号化された文字列（IV:暗号化データ の形式）
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // IVと暗号化データを結合（IV:暗号化データ）
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * 暗号化された文字列を復号化
 * @param text 暗号化された文字列（IV:暗号化データ の形式）
 * @returns 復号化された文字列
 */
export function decrypt(text: string): string {
  if (!text) {
    throw new Error('Text to decrypt cannot be empty');
  }

  const key = getEncryptionKey();
  const parts = text.split(':');
  
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 口座番号をマスクして表示（下4桁のみ表示）
 * @param accountNumber 口座番号
 * @returns マスクされた口座番号（例: *******1234）
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }
  
  const last4 = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  
  return masked + last4;
}

