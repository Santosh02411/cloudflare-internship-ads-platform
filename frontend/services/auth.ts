/**
 * Frontend Auth Service - Manage authentication state
 */

import { authAPI } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  [key: string]: any;
}

interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

interface AuthService {
  signup(email: string, password: string, name: string): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  logout(): void;
  getToken(): string | null;
  getUser(): User | null;
  isAuthenticated(): boolean;
}

export const authService: AuthService = {
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const response = await authAPI.signup(email, password, name);
      const { token, user, expiresIn } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('expiresIn', expiresIn.toString());

      return { token, user, expiresIn };
    } catch (error: any) {
      throw error.response?.data?.error || 'Signup failed';
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await authAPI.login(email, password);
      const { token, user, expiresIn } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('expiresIn', expiresIn.toString());

      return { token, user, expiresIn };
    } catch (error: any) {
      throw error.response?.data?.error || 'Login failed';
    }
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('expiresIn');
  },

  getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  },

  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  },
};

export default authService;
