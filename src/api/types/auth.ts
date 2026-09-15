import type { NumericId } from './common';

export type ApiUserRole = 'Admin' | 'Representative';

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginUserResponseDto {
  id: NumericId;
  name: string;
  email: string;
  role: ApiUserRole;
}

export interface LoginResponseDto {
  message: string;
  access_token: string;
  user: LoginUserResponseDto;
}

export interface VerifyPasswordResponseDto {
  message: string;
  verified: boolean;
}
