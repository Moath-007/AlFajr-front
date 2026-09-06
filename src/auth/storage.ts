import type { LoginUserResponseDto } from '@/api';

const AUTH_USER_KEY = 'alfajr_auth_user';

export function getStoredUser(): LoginUserResponseDto | null {
  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;

  try {
    const value: unknown = JSON.parse(stored);
    return isLoginUser(value) ? value : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: LoginUserResponseDto): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(AUTH_USER_KEY);
}

function isLoginUser(value: unknown): value is LoginUserResponseDto {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<LoginUserResponseDto>;
  return typeof user.id === 'number'
    && typeof user.name === 'string'
    && typeof user.email === 'string'
    && (user.role === 'Admin' || user.role === 'Representative');
}
