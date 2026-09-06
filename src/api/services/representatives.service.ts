import { apiClient } from '../client';
import type {
  CreateRepresentativeDto,
  RepresentativeActionResponseDto,
  RepresentativeDetailsResponseDto,
  RepresentativesListResponseDto,
  UpdateRepresentativeDto,
  UpdateRepresentativePasswordDto,
  UpdateRepresentativePasswordResponseDto,
  UpdateRepresentativeResponseDto,
  UpdateRepresentativeStatusDto,
  UpdateRepresentativeStatusResponseDto,
} from '../types';

export const representativesService = {
  list: (isActive?: boolean, signal?: AbortSignal) => {
    const query = isActive === undefined ? '' : `?is_active=${isActive}`;
    return apiClient.get<RepresentativesListResponseDto>(`/representatives${query}`, { signal });
  },
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<RepresentativeDetailsResponseDto>(`/representatives/${id}`, { signal }),
  create: (data: CreateRepresentativeDto, signal?: AbortSignal) =>
    apiClient.post<RepresentativeActionResponseDto>('/representatives', data, { signal }),
  update: (id: number, data: UpdateRepresentativeDto, signal?: AbortSignal) =>
    apiClient.patch<UpdateRepresentativeResponseDto>(`/representatives/${id}`, data, { signal }),
  updateStatus: (id: number, data: UpdateRepresentativeStatusDto, signal?: AbortSignal) =>
    apiClient.patch<UpdateRepresentativeStatusResponseDto>(`/representatives/${id}/status`, data, { signal }),
  updatePassword: (id: number, data: UpdateRepresentativePasswordDto, signal?: AbortSignal) =>
    apiClient.patch<UpdateRepresentativePasswordResponseDto>(`/representatives/${id}/password`, data, { signal }),
};
