import { apiClient } from '../client';
import type { CompanyProfileResponseDto, UpdateCompanyProfileDto } from '../types';

export const companyProfileService = {
  get: (signal?: AbortSignal) =>
    apiClient.get<CompanyProfileResponseDto>('/company-profile', { signal }),
  update: (data: UpdateCompanyProfileDto, signal?: AbortSignal) =>
    apiClient.patch<CompanyProfileResponseDto>('/company-profile', data, { signal }),
};
