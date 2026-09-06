import { apiClient } from '../client';
import type { LoginDto, LoginResponseDto } from '../types';

export const authService = {
  login: (credentials: LoginDto, signal?: AbortSignal) =>
    apiClient.post<LoginResponseDto>('/auth/login', credentials, { signal }),
};
