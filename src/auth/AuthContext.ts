import { createContext } from 'react';
import type { LoginDto, LoginUserResponseDto } from '@/api';

export interface AuthContextValue {
  user: LoginUserResponseDto | null;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  login: (credentials: LoginDto) => Promise<LoginUserResponseDto>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
