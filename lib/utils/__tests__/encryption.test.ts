/**
 * 暗号化ユーティリティのテスト
 */
import crypto from 'crypto';

// テスト用の暗号化キーを生成
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

// 環境変数をセットアップ
beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

import { encrypt, decrypt, maskAccountNumber } from '../encryption';

describe('encrypt', () => {
  it('文字列を暗号化してIV:暗号文の形式で返す', () => {
    const result = encrypt('1234567');
    expect(result).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
  });

  it('同じ入力でも毎回異なる暗号文を生成する（IVがランダム）', () => {
    const text = '1234567';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('空文字列はエラーをスローする', () => {
    expect(() => encrypt('')).toThrow('Text to encrypt cannot be empty');
  });

  it('日本語文字列を暗号化できる', () => {
    const text = 'みずほ銀行 口座番号1234567';
    const encrypted = encrypt(text);
    expect(encrypted).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
  });

  it('長い文字列を暗号化できる', () => {
    const text = 'A'.repeat(10000);
    const encrypted = encrypt(text);
    expect(encrypted).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
  });
});

describe('decrypt', () => {
  it('暗号化した文字列を正しく復号化できる', () => {
    const original = '1234567';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('日本語文字列を正しく復号化できる', () => {
    const original = 'みずほ銀行 口座番号1234567';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('空文字列はエラーをスローする', () => {
    expect(() => decrypt('')).toThrow('Text to decrypt cannot be empty');
  });

  it('不正なフォーマットはエラーをスローする', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
  });

  it('コロンが2つ以上ある場合はエラーをスローする', () => {
    expect(() => decrypt('a:b:c')).toThrow('Invalid encrypted text format');
  });

  it('不正な暗号文はエラーをスローする', () => {
    const fakeIv = crypto.randomBytes(16).toString('hex');
    expect(() => decrypt(`${fakeIv}:invalidhexdata`)).toThrow();
  });
});

describe('encrypt → decrypt ラウンドトリップ', () => {
  const testCases = [
    '1234567',
    '0000001',
    '9999999',
    '12345678901234',
    '特殊文字!@#$%',
    'a',
    '0'.repeat(100),
  ];

  testCases.forEach((text) => {
    it(`"${text.substring(0, 20)}..." を暗号化→復号化できる`, () => {
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(text);
    });
  });
});

describe('maskAccountNumber', () => {
  it('7桁の口座番号で下4桁のみ表示', () => {
    expect(maskAccountNumber('1234567')).toBe('***4567');
  });

  it('4桁の口座番号はマスクなしで全桁表示', () => {
    expect(maskAccountNumber('1234')).toBe('1234');
  });

  it('3桁以下は****を返す', () => {
    expect(maskAccountNumber('123')).toBe('****');
  });

  it('空文字列は****を返す', () => {
    expect(maskAccountNumber('')).toBe('****');
  });

  it('10桁の口座番号で下4桁のみ表示', () => {
    expect(maskAccountNumber('1234567890')).toBe('******7890');
  });

  it('5桁の口座番号で下4桁のみ表示', () => {
    expect(maskAccountNumber('12345')).toBe('*2345');
  });
});

describe('暗号化キーが未設定の場合', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    delete process.env.ENCRYPTION_KEY;
    // モジュールキャッシュをクリアして再読み込み
    jest.resetModules();
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('encrypt時にエラーをスローする', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { encrypt: freshEncrypt } = require('../encryption');
    expect(() => freshEncrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
  });

  it('decrypt時にエラーをスローする', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { decrypt: freshDecrypt } = require('../encryption');
    const fakeIv = crypto.randomBytes(16).toString('hex');
    expect(() => freshDecrypt(`${fakeIv}:abcd`)).toThrow('ENCRYPTION_KEY environment variable is not set');
  });
});
