import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSSクラスをマージする
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * パスからロールを取得する
 */
export function getRoleFromPath(pathname: string): 'user' | 'instructor' | 'admin' | null {
  const segments = pathname.split('/');
  const firstSegment = segments[1];

  if (firstSegment === 'admin') return 'admin';
  if (firstSegment === 'instructor') return 'instructor';
  if (firstSegment === 'user') return 'user';

  return null;
}
