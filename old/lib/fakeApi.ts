import { mockUsers, type Role, type MockUser } from './mock';

export interface AuthResult {
  ok: boolean;
  user?: MockUser;
  error?: string;
}

export interface AuthData {
  role: Role;
  user: MockUser;
}

export const fakeApi = {
  login(role: Role, username: string, password: string): AuthResult {
    const users = mockUsers[role];
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      const authData: AuthData = { role, user };
      localStorage.setItem('rf_auth', JSON.stringify(authData));
      return { ok: true, user };
    }
    
    return { ok: false, error: 'ユーザ名またはパスワードが違います' };
  },

  logout(): void {
    localStorage.removeItem('rf_auth');
  },

  getCurrentAuth(): AuthData | null {
    try {
      const stored = localStorage.getItem('rf_auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
};