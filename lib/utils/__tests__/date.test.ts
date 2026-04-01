import { formatDate, formatDateForInput } from '../date';

describe('formatDate', () => {
  it('Dateオブジェクトを YYYY/MM/DD 形式にフォーマットする', () => {
    const date = new Date(2024, 11, 30); // 月は0始まり
    expect(formatDate(date)).toBe('2024/12/30');
  });

  it('ISO文字列を YYYY/MM/DD 形式にフォーマットする', () => {
    expect(formatDate('2024-12-30T00:00:00.000Z')).toMatch(/2024\/12\/3[01]/);
  });

  it('nullの場合は"-"を返す', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('undefinedの場合は"-"を返す', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('無効な日付文字列の場合は"-"を返す', () => {
    expect(formatDate('invalid-date')).toBe('-');
  });

  it('月・日が1桁の場合ゼロパディングする', () => {
    const date = new Date(2024, 0, 5); // 1月5日
    expect(formatDate(date)).toBe('2024/01/05');
  });
});

describe('formatDateForInput', () => {
  it('Dateオブジェクトを YYYY-MM-DD 形式にフォーマットする', () => {
    const date = new Date(2024, 11, 30);
    expect(formatDateForInput(date)).toBe('2024-12-30');
  });

  it('nullの場合は空文字を返す', () => {
    expect(formatDateForInput(null)).toBe('');
  });

  it('undefinedの場合は空文字を返す', () => {
    expect(formatDateForInput(undefined)).toBe('');
  });

  it('無効な日付文字列の場合は空文字を返す', () => {
    expect(formatDateForInput('not-a-date')).toBe('');
  });

  it('月・日が1桁の場合ゼロパディングする', () => {
    const date = new Date(2024, 0, 5);
    expect(formatDateForInput(date)).toBe('2024-01-05');
  });
});
