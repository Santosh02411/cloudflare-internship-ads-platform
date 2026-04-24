/**
 * Frontend useAuth Hook - Manage authentication state
 */

'use client';

import { useState, useEffect } from 'react';
import authService from '../services/auth';

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

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, password: string, name: string) => Promise<AuthResponse>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();

    setUser(user);
    setIsAuthenticated(isAuth);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<AuthResponse> => {
    setLoading(true);
    try {
      const result = await authService.signup(email, password, name);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
  };
}

export default useAuth;
