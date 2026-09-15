import { apiClient } from '../client';
import type { LoginDto, LoginResponseDto, VerifyPasswordResponseDto } from '../types';

export const authService = {
  login: (credentials: LoginDto, signal?: AbortSignal) =>
    apiClient.post<LoginResponseDto>('/auth/login', credentials, { signal }),
  verifyCurrentPassword: (password: string, signal?: AbortSignal) =>
    apiClient.post<VerifyPasswordResponseDto>('/auth/verify-password', { password }, {
      signal,
      // Wrong-password 401 is validation; any other 401 still follows the normal expired-session flow.
      suppressUnauthorizedNotification: (payload) => Boolean(
        payload && typeof payload === 'object' && 'message' in payload
        && String(payload.message).includes('كلمة المرور غير صحيحة')
      ),
    }),
};
