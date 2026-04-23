/**
 * Frontend Auth Service - Manage authentication state
 */

import { authAPI } from './api';

export const authService = {
  async signup(email, password, name) {
    try {
      const response = await authAPI.signup(email, password, name);
      const { token, user, expiresIn } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('expiresIn', expiresIn);

      return { token, user, expiresIn };
    } catch (error) {
      throw error.response?.data?.error || 'Signup failed';
    }
  },

  async login(email, password) {
    try {
      const response = await authAPI.login(email, password);
      const { token, user, expiresIn } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('expiresIn', expiresIn);

      return { token, user, expiresIn };
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('expiresIn');
  },

  getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  },

  getUser() {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return this.getToken() !== null;
  },
};

export default authService;
