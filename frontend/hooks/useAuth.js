/**
 * Frontend useAuth Hook - Manage authentication state
 */

'use client';

import { useState, useEffect } from 'react';
import authService from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    const isAuth = authService.isAuthenticated();

    setUser(user);
    setIsAuthenticated(isAuth);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
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

  const signup = async (email, password, name) => {
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

  const logout = () => {
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
