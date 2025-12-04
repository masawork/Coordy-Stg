const JAPAN_COUNTRY_CODE = '+81';
const DOMESTIC_PHONE_PATTERN = /^0\d{9,10}$/;
const E164_PATTERN = /^\+\d{10,15}$/;

const stripNonDigits = (value: string) => value.replace(/\D/g, '');

export function isValidJapanPhoneNumber(input?: string | null) {
  if (!input) return false;
  const digits = stripNonDigits(input);
  return DOMESTIC_PHONE_PATTERN.test(digits);
}

export function toE164PhoneNumber(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  const digits = stripNonDigits(trimmed);

  if (trimmed.startsWith('+')) {
    const normalized = `+${digits}`;
    return E164_PATTERN.test(normalized) ? normalized : null;
  }

  if (!DOMESTIC_PHONE_PATTERN.test(digits)) {
    return null;
  }

  return `${JAPAN_COUNTRY_CODE}${digits.substring(1)}`;
}

export function toJapanDomesticPhoneNumber(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith(JAPAN_COUNTRY_CODE)) {
    const digits = stripNonDigits(trimmed);
    return digits.length > 2 ? `0${digits.substring(2)}` : '';
  }

  const digits = stripNonDigits(trimmed);
  if (!digits) {
    return '';
  }

  if (digits.startsWith('0')) {
    return digits;
  }

  return digits;
}
