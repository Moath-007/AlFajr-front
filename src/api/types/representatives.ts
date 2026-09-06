import type { IsoDateTimeString, NumericId } from './common';

export interface RepresentativeRoleResponseDto {
  role_id: NumericId;
  role_name: string;
}

export interface RepresentativeResponseDto {
  user_id: NumericId;
  name: string;
  phone?: string | null;
  email: string;
  is_active: boolean;
  created_at: IsoDateTimeString;
  roles: RepresentativeRoleResponseDto;
}

export interface CreateRepresentativeDto {
  name: string;
  phone?: string;
  email: string;
  password: string;
}

export interface RepresentativeActionResponseDto {
  message: string;
  representative: RepresentativeResponseDto;
}

export interface RepresentativesListResponseDto {
  message: string;
  representatives: RepresentativeResponseDto[];
}

export interface RepresentativeDetailsResponseDto {
  message: string;
  representative: RepresentativeResponseDto;
}

export interface UpdateRepresentativeDto {
  name: string;
  phone: string;
  email: string;
}

export interface RepresentativeWithoutCreatedAtResponseDto {
  user_id: NumericId;
  name: string;
  phone?: string | null;
  email: string;
  is_active: boolean;
  roles: RepresentativeRoleResponseDto;
}

export interface UpdateRepresentativeResponseDto {
  message: string;
  representative: RepresentativeWithoutCreatedAtResponseDto;
}

export interface UpdateRepresentativeStatusDto {
  is_active: boolean;
}

export interface RepresentativeStatusDataDto {
  user_id: NumericId;
  name: string;
  phone?: string | null;
  email: string;
  is_active: boolean;
}

export interface UpdateRepresentativeStatusResponseDto {
  message: string;
  representative: RepresentativeStatusDataDto;
}

export interface UpdateRepresentativePasswordDto {
  password: string;
}

export interface UpdateRepresentativePasswordResponseDto {
  message: string;
}
