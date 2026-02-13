/**
 * 電話番号ユーティリティ
 * 日本国内の電話番号（携帯電話・固定電話）に対応
 */

/**
 * 全角文字を半角に変換
 */
function toHalfWidth(str: string): string {
  return str.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  ).replace(/ー/g, '-');
}

/**
 * 電話番号を正規化（数字のみに変換）
 */
export function normalizePhoneNumber(phone: string): string {
  // 全角を半角に変換
  let normalized = toHalfWidth(phone);
  
  // 数字とハイフン以外を削除
  normalized = normalized.replace(/[^\d-]/g, '');
  
  // ハイフンを一旦削除
  const digitsOnly = normalized.replace(/-/g, '');
  
  return digitsOnly;
}

/**
 * 電話番号にハイフンを追加してフォーマット
 */
export function formatPhoneNumber(phone: string): string {
  // 正規化（数字のみ）
  const digitsOnly = normalizePhoneNumber(phone);
  
  // 11桁（携帯電話）
  if (digitsOnly.length === 11) {
    return digitsOnly.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  // 10桁（固定電話）
  if (digitsOnly.length === 10) {
    // 03, 06 などの2桁市外局番
    if (digitsOnly.startsWith('03') || digitsOnly.startsWith('04') || 
        digitsOnly.startsWith('06') || digitsOnly.startsWith('05')) {
      return digitsOnly.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    // その他の3桁市外局番
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  // 9桁（一部の固定電話: 0XX-XX-XXXX）
  if (digitsOnly.length === 9) {
    return digitsOnly.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
  }
  
  // フォーマットできない場合は元の文字列を返す
  return phone;
}

/**
 * 電話番号のバリデーション
 * 携帯電話・固定電話の両方に対応
 */
export function validatePhoneNumber(phone: string): boolean {
  const digitsOnly = normalizePhoneNumber(phone);
  
  // 9桁、10桁、または11桁の数字
  if (!/^\d{9,11}$/.test(digitsOnly)) {
    return false;
  }
  
  // 0から始まる
  if (!digitsOnly.startsWith('0')) {
    return false;
  }
  
  // 11桁の場合: 携帯電話（090, 080, 070, 050）
  if (digitsOnly.length === 11) {
    return /^(090|080|070|050)\d{8}$/.test(digitsOnly);
  }
  
  // 10桁の場合: 固定電話
  if (digitsOnly.length === 10) {
    // 主要都市の2桁市外局番（03, 04, 05, 06）
    // または3桁市外局番（0XX）
    return /^0\d{9}$/.test(digitsOnly);
  }
  
  // 9桁の場合: 一部の固定電話
  if (digitsOnly.length === 9) {
    return /^0\d{8}$/.test(digitsOnly);
  }
  
  return false;
}

/**
 * 電話番号の種類を判定
 */
export function getPhoneNumberType(phone: string): 'mobile' | 'landline' | 'unknown' {
  const digitsOnly = normalizePhoneNumber(phone);
  
  if (digitsOnly.length === 11 && /^(090|080|070|050)/.test(digitsOnly)) {
    return 'mobile';
  }
  
  if (digitsOnly.length === 10 || digitsOnly.length === 9) {
    return 'landline';
  }
  
  return 'unknown';
}

/**
 * 電話番号を国際フォーマット (+81) に変換
 * 例: 09012345678 → +819012345678
 */
export function toInternationalFormat(phone: string): string {
  const digitsOnly = normalizePhoneNumber(phone);

  // 既に + で始まっている場合はそのまま返す
  if (phone.startsWith('+')) {
    return phone;
  }

  // 日本の電話番号を国際フォーマットに変換
  if (digitsOnly.startsWith('0')) {
    return '+81' + digitsOnly.substring(1);
  }

  return digitsOnly;
}

/**
 * 電話番号のエラーメッセージを取得
 */
export function getPhoneNumberErrorMessage(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return '電話番号を入力してください';
  }
  
  const digitsOnly = normalizePhoneNumber(phone);
  
  if (digitsOnly.length < 9) {
    return '電話番号が短すぎます（9桁以上必要です）';
  }
  
  if (digitsOnly.length > 11) {
    return '電話番号が長すぎます（11桁以内で入力してください）';
  }
  
  if (!digitsOnly.startsWith('0')) {
    return '電話番号は0から始まる必要があります';
  }
  
  if (digitsOnly.length === 11 && !/^(090|080|070|050)/.test(digitsOnly)) {
    return '携帯電話番号は090/080/070/050から始まる必要があります';
  }
  
  if (!validatePhoneNumber(phone)) {
    return '有効な電話番号を入力してください';
  }
  
  return null;
}

