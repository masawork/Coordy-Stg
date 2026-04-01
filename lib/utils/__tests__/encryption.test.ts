import crypto from 'crypto';
import { encrypt, decrypt, maskAccountNumber } from '../encryption';

// テスト用の暗号化キーを設定
const TEST_KEY = crypto.randomBytes(32).toString('base64');

beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('encrypt', () => {
  it('文字列を暗号化してIV:データ形式で返す', () => {
    const result = encrypt('1234567');
    expect(result).toContain(':');
    const parts = result.split(':');
    expect(parts).toHaveLength(2);
    // IVは32文字のhex (16バイト)
    expect(parts[0]).toHaveLength(32);
  });

  it('同じ文字列でも毎回異なる暗号文を生成する（IVがランダム）', () => {
    const result1 = encrypt('1234567');
    const result2 = encrypt('1234567');
    expect(result1).not.toBe(result2);
  });

  it('空文字列でエラーを投げる', () => {
    expect(() => encrypt('')).toThrow('Text to encrypt cannot be empty');
  });

  it('日本語文字列も暗号化できる', () => {
    const result = encrypt('銀行口座テスト');
    expect(result).toContain(':');
  });
});

describe('decrypt', () => {
  it('暗号化した文字列を正しく復号化する', () => {
    const original = '1234567';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('日本語文字列を正しく復号化する', () => {
    const original = '三菱UFJ銀行 渋谷支店';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('長い文字列を正しく復号化する', () => {
    const original = 'A'.repeat(1000);
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('空文字列でエラーを投げる', () => {
    expect(() => decrypt('')).toThrow('Text to decrypt cannot be empty');
  });

  it('不正な形式でエラーを投げる', () => {
    expect(() => decrypt('invalidformat')).toThrow('Invalid encrypted text format');
  });

  it('改ざんされた暗号文でエラーを投げる', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    const tampered = parts[0] + ':' + 'ff'.repeat(parts[1].length / 2);
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('encrypt/decrypt without ENCRYPTION_KEY', () => {
  it('ENCRYPTION_KEYが未設定の場合エラーを投げる', () => {
    const savedKey = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    process.env.ENCRYPTION_KEY = savedKey;
  });
});

describe('maskAccountNumber', () => {
  it('口座番号の下4桁のみ表示する', () => {
    expect(maskAccountNumber('1234567')).toBe('***4567');
  });

  it('4桁の口座番号はそのまま返す', () => {
    expect(maskAccountNumber('1234')).toBe('1234');
  });

  it('3桁以下の場合は****を返す', () => {
    expect(maskAccountNumber('123')).toBe('****');
  });

  it('空文字列は****を返す', () => {
    expect(maskAccountNumber('')).toBe('****');
  });

  it('長い口座番号も正しくマスクする', () => {
    expect(maskAccountNumber('12345678901234')).toBe('**********1234');
  });
});
