import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  authService,
  clearApiSession,
  getAccessToken,
  setAccessToken,
  subscribeToUnauthorized,
  type LoginDto,
  type LoginUserResponseDto,
} from '@/api';
import { AuthContext, type AuthContextValue } from './AuthContext';
import { clearStoredUser, getStoredUser, setStoredUser } from './storage';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<LoginUserResponseDto | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const locationRef = useRef(location.pathname);

  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (token && storedUser) {
      setUser(storedUser);
    } else {
      clearApiSession();
      clearStoredUser();
    }
    setIsRestoringSession(false);
  }, []);

  useEffect(() => subscribeToUnauthorized(() => {
    const currentPath = locationRef.current;
    clearStoredUser();
    setUser(null);

    if (currentPath === '/login' || currentPath === '/owner/login' || currentPath === '/rep/login') return;
    navigate('/login', { replace: true });
  }), [navigate]);

  const login = useCallback(async (credentials: LoginDto) => {
    const response = await authService.login(credentials);
    setAccessToken(response.access_token);
    setStoredUser(response.user);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    clearApiSession();
    clearStoredUser();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isRestoringSession,
    login,
    logout,
  }), [isRestoringSession, login, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
