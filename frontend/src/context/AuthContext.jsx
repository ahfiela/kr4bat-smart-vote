import React, { createContext, useContext, useState, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('user_name');
    return token && role ? { token, role, name } : null;
  });

  const login = useCallback(async (userId, password) => {
    const res = await apiClient.post('/auth/login', {
      user_id: userId,
      password,
    });

    const { token, role, user } = res.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('user_name', user.name);

    setAuth({ token, role, name: user.name });
    return role;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}