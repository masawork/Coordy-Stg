/**
 * 数値入力ユーティリティ
 * 全角数字→半角数字の変換、入力サニタイズ
 */

/**
 * 全角数字・記号を半角に変換
 * ０１２３４５６７８９ → 0123456789
 * ．→. ，→, ー→-
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/．/g, '.')
    .replace(/，/g, ',')
    .replace(/ー/g, '-');
}

/**
 * 数値入力用のサニタイズ
 * 全角→半角変換後、数字・小数点・マイナスのみ残す
 */
export function sanitizeNumericInput(value: string, allowDecimal = false): string {
  const half = toHalfWidth(value);
  if (allowDecimal) {
    // 数字、小数点、マイナスのみ許可
    return half.replace(/[^0-9.\-]/g, '');
  }
  // 整数のみ: 数字とマイナスのみ許可
  return half.replace(/[^0-9\-]/g, '');
}

/**
 * React onChange用ヘルパー
 * input type="text"で使い、全角入力も受け付ける数値フィールドを実現
 *
 * @example
 * <input
 *   type="text"
 *   inputMode="numeric"
 *   value={price}
 *   onChange={(e) => setPrice(handleNumericInput(e.target.value))}
 * />
 */
export function handleNumericInput(value: string, allowDecimal = false): string {
  return sanitizeNumericInput(value, allowDecimal);
}
