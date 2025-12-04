import { type AuthData, type Role } from './mock';

export function parseAuthCookie(cookieValue: string | undefined): AuthData | null {
  if (!cookieValue) return null;

  try {
    return JSON.parse(cookieValue) as AuthData;
  } catch {
    return null;
  }
}

export function extractRoleFromCookie(cookieValue: string | undefined): Role | null {
  const authData = parseAuthCookie(cookieValue);
  return authData?.role || null;
}