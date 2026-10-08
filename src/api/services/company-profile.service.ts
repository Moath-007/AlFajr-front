import { apiClient } from '../client';
import type { CompanyProfileResponseDto, UpdateCompanyProfileDto } from '../types';
export const companyProfileService = {
  get: (signal?: AbortSignal) => apiClient.get<CompanyProfileResponseDto>('/company-profile', { signal }),
  update: (data: UpdateCompanyProfileDto, signal?: AbortSignal) => {
    const { home_image, about_image, contact_image, ...fields } = data;
    if (!home_image && !about_image && !contact_image)
      return apiClient.patch<CompanyProfileResponseDto>('/company-profile', fields, { signal });
    const form = new FormData();
    for (const [key, value] of Object.entries(fields))
      if (value !== undefined) form.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
    if (home_image) form.append('home_image', home_image);
    if (about_image) form.append('about_image', about_image);
    if (contact_image) form.append('contact_image', contact_image);
    return apiClient.patch<CompanyProfileResponseDto>('/company-profile', form, { signal });
  },
};
