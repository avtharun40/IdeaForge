import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthSession, LoginCredentials, RegisterData, User } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from storage on app launch
  useEffect(() => {
    try {
      const activeSession = authService.getSession();
      if (activeSession) {
        setSession(activeSession);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Error hydrating auth session:', err);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const newSession = await authService.register(data);
      setSession(newSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      session,
      isAuthenticated: Boolean(session && session.user && session.token),
      isLoading,
      login,
      register,
      logout
    }),
    [session, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
