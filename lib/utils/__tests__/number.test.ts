import { toHalfWidth, sanitizeNumericInput, handleNumericInput } from '../number';

describe('toHalfWidth', () => {
  it('should convert full-width digits to half-width', () => {
    expect(toHalfWidth('０１２３４５６７８９')).toBe('0123456789');
  });

  it('should convert full-width period and comma', () => {
    expect(toHalfWidth('１，０００．５')).toBe('1,000.5');
  });

  it('should convert full-width minus', () => {
    expect(toHalfWidth('ー１００')).toBe('-100');
  });

  it('should leave half-width characters unchanged', () => {
    expect(toHalfWidth('12345')).toBe('12345');
  });

  it('should handle mixed full-width and half-width', () => {
    expect(toHalfWidth('１2３4５')).toBe('12345');
  });

  it('should handle empty string', () => {
    expect(toHalfWidth('')).toBe('');
  });

  it('should preserve non-numeric characters', () => {
    expect(toHalfWidth('価格：５０００円')).toBe('価格：5000円');
  });
});

describe('sanitizeNumericInput', () => {
  it('should strip non-numeric characters (integer mode)', () => {
    expect(sanitizeNumericInput('abc123def')).toBe('123');
  });

  it('should convert full-width and strip non-numeric', () => {
    expect(sanitizeNumericInput('５０００円')).toBe('5000');
  });

  it('should handle full-width input like ５，０００', () => {
    expect(sanitizeNumericInput('５，０００')).toBe('5000');
  });

  it('should strip decimal point in integer mode', () => {
    expect(sanitizeNumericInput('100.5')).toBe('1005');
  });

  it('should allow decimal point when allowDecimal is true', () => {
    expect(sanitizeNumericInput('100.5', true)).toBe('100.5');
  });

  it('should allow negative numbers', () => {
    expect(sanitizeNumericInput('-500')).toBe('-500');
  });

  it('should convert full-width minus', () => {
    expect(sanitizeNumericInput('ー５００')).toBe('-500');
  });

  it('should handle empty string', () => {
    expect(sanitizeNumericInput('')).toBe('');
  });
});

describe('handleNumericInput', () => {
  it('should work as a convenience wrapper for sanitizeNumericInput', () => {
    expect(handleNumericInput('５０００')).toBe('5000');
  });

  it('should handle typical price input with full-width', () => {
    expect(handleNumericInput('１０，０００')).toBe('10000');
  });

  it('should pass through half-width numbers', () => {
    expect(handleNumericInput('3000')).toBe('3000');
  });

  it('should handle decimal with allowDecimal', () => {
    expect(handleNumericInput('９９．９', true)).toBe('99.9');
  });
});
