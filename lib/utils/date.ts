/**
 * 日付フォーマット用ユーティリティ関数
 */

/**
 * 日付を YYYY/MM/DD 形式にフォーマット
 * @param date - Date オブジェクト、ISO文字列、または null
 * @returns フォーマットされた日付文字列（例: "2024/12/30"）
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // 無効な日付の場合
    if (isNaN(d.getTime())) {
      return '-';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}/${month}/${day}`;
  } catch (error) {
    console.error('Date format error:', error);
    return '-';
  }
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマット（input[type="date"] 用）
 * @param date - Date オブジェクト、ISO文字列、または null
 * @returns フォーマットされた日付文字列（例: "2024-12-30"）
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // 無効な日付の場合
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Date format error:', error);
    return '';
  }
}

