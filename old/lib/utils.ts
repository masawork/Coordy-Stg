import { type Role } from './mock';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function getRoleFromPath(pathname: string): Role | null {
  const segments = pathname.split('/');
  const firstSegment = segments[1];

  if (firstSegment === 'admin') return 'admin';
  if (firstSegment === 'instructor') return 'instructor';
  if (firstSegment === 'user') return 'user';

  return null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}