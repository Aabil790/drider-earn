import React, { createContext, useState, useEffect, useContext } from 'react';
import { getUser, setUser as saveUser, getToken, removeToken, removeUser } from '@/lib/auth';
import api from '@/lib/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          saveUser(response.data);
        } catch (error) {
          removeToken();
          removeUser();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    saveUser(userData);
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    removeToken();
    removeUser();
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    saveUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, setUser: login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
