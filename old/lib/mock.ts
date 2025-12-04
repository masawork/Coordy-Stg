export type Role = 'user' | 'instructor' | 'admin';

export interface MockUser {
  id: string;
  username: string;
  password: string;
  name: string;
}

export const mockUsers = {
  user: [{ id: 'u-01', username: 'user01', password: 'user01', name: 'User 01' }],
  instructor: [{ id: 'i-01', username: 'inst01', password: 'inst01', name: 'Instructor 01' }],
  admin: [{ id: 'a-01', username: 'admin01', password: 'admin01', name: 'Admin 01' }],
} as const;