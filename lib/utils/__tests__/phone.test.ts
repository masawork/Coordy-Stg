/**
 * 電話番号ユーティリティのテスト
 */

import {
  normalizePhoneNumber,
  formatPhoneNumber,
  validatePhoneNumber,
  getPhoneNumberType,
  getPhoneNumberErrorMessage,
} from '../phone';

describe('normalizePhoneNumber', () => {
  it('全角数字を半角に変換', () => {
    expect(normalizePhoneNumber('０９０１２３４５６７８')).toBe('09012345678');
  });

  it('全角ハイフンを削除', () => {
    expect(normalizePhoneNumber('０９０ー１２３４ー５６７８')).toBe('09012345678');
  });

  it('スペースを削除', () => {
    expect(normalizePhoneNumber('090 1234 5678')).toBe('09012345678');
  });

  it('括弧を削除', () => {
    expect(normalizePhoneNumber('(090)1234-5678')).toBe('09012345678');
  });

  it('混在した入力を正規化', () => {
    expect(normalizePhoneNumber('０９０ (1234) ５６７８')).toBe('09012345678');
  });
});

describe('formatPhoneNumber', () => {
  it('11桁の携帯電話番号をフォーマット', () => {
    expect(formatPhoneNumber('09012345678')).toBe('090-1234-5678');
  });

  it('10桁の固定電話番号（03）をフォーマット', () => {
    expect(formatPhoneNumber('0312345678')).toBe('03-1234-5678');
  });

  it('10桁の固定電話番号（06）をフォーマット', () => {
    expect(formatPhoneNumber('0612345678')).toBe('06-1234-5678');
  });

  it('10桁の固定電話番号（3桁市外局番）をフォーマット', () => {
    expect(formatPhoneNumber('0771234567')).toBe('077-123-4567');
  });

  it('全角入力をフォーマット', () => {
    expect(formatPhoneNumber('０９０１２３４５６７８')).toBe('090-1234-5678');
  });

  it('既にフォーマット済みの番号はそのまま', () => {
    expect(formatPhoneNumber('090-1234-5678')).toBe('090-1234-5678');
  });
});

describe('validatePhoneNumber', () => {
  // 携帯電話
  it('090で始まる11桁は有効', () => {
    expect(validatePhoneNumber('09012345678')).toBe(true);
  });

  it('080で始まる11桁は有効', () => {
    expect(validatePhoneNumber('08012345678')).toBe(true);
  });

  it('070で始まる11桁は有効', () => {
    expect(validatePhoneNumber('07012345678')).toBe(true);
  });

  it('050で始まる11桁は有効', () => {
    expect(validatePhoneNumber('05012345678')).toBe(true);
  });

  // 固定電話
  it('03で始まる10桁は有効', () => {
    expect(validatePhoneNumber('0312345678')).toBe(true);
  });

  it('06で始まる10桁は有効', () => {
    expect(validatePhoneNumber('0612345678')).toBe(true);
  });

  // 無効なケース
  it('0から始まらない番号は無効', () => {
    expect(validatePhoneNumber('9012345678')).toBe(false);
  });

  it('8桁以下は無効', () => {
    expect(validatePhoneNumber('09012345')).toBe(false);
  });

  it('12桁以上は無効', () => {
    expect(validatePhoneNumber('090123456789')).toBe(false);
  });

  it('11桁で090/080/070/050以外は無効', () => {
    expect(validatePhoneNumber('09912345678')).toBe(false);
  });

  // 全角入力も検証
  it('全角入力も正しく検証', () => {
    expect(validatePhoneNumber('０９０１２３４５６７８')).toBe(true);
  });
});

describe('getPhoneNumberType', () => {
  it('090は携帯電話', () => {
    expect(getPhoneNumberType('09012345678')).toBe('mobile');
  });

  it('080は携帯電話', () => {
    expect(getPhoneNumberType('08012345678')).toBe('mobile');
  });

  it('070は携帯電話', () => {
    expect(getPhoneNumberType('07012345678')).toBe('mobile');
  });

  it('050は携帯電話', () => {
    expect(getPhoneNumberType('05012345678')).toBe('mobile');
  });

  it('03は固定電話', () => {
    expect(getPhoneNumberType('0312345678')).toBe('landline');
  });

  it('06は固定電話', () => {
    expect(getPhoneNumberType('0612345678')).toBe('landline');
  });

  it('無効な番号はunknown', () => {
    expect(getPhoneNumberType('123')).toBe('unknown');
  });
});

describe('getPhoneNumberErrorMessage', () => {
  it('空文字はエラー', () => {
    expect(getPhoneNumberErrorMessage('')).toBe('電話番号を入力してください');
  });

  it('短すぎる番号はエラー', () => {
    expect(getPhoneNumberErrorMessage('090123')).toBe('電話番号が短すぎます（9桁以上必要です）');
  });

  it('長すぎる番号はエラー', () => {
    expect(getPhoneNumberErrorMessage('090123456789')).toBe('電話番号が長すぎます（11桁以内で入力してください）');
  });

  it('0から始まらない番号はエラー', () => {
    expect(getPhoneNumberErrorMessage('9012345678')).toBe('電話番号は0から始まる必要があります');
  });

  it('11桁で090/080/070/050以外はエラー', () => {
    expect(getPhoneNumberErrorMessage('09912345678')).toBe('携帯電話番号は090/080/070/050から始まる必要があります');
  });

  it('有効な番号はnull', () => {
    expect(getPhoneNumberErrorMessage('09012345678')).toBeNull();
  });
});

