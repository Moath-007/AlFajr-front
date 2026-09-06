import { apiClient } from '../client';
import type {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from '../types';

export const categoriesService = {
  list: (signal?: AbortSignal) =>
    apiClient.get<CategoryResponseDto[]>('/categories', { signal }),
  getById: (id: number, signal?: AbortSignal) =>
    apiClient.get<CategoryResponseDto>(`/categories/${id}`, { signal }),
  create: (data: CreateCategoryDto, signal?: AbortSignal) =>
    apiClient.post<CategoryResponseDto>('/categories', data, { signal }),
  update: (id: number, data: UpdateCategoryDto, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponseDto>(`/categories/${id}`, data, { signal }),
  updateStatus: (id: number, data: UpdateCategoryStatusDto, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponseDto>(`/categories/${id}/status`, data, { signal }),
  delete: (id: number, signal?: AbortSignal) =>
    apiClient.delete<CategoryResponseDto>(`/categories/${id}`, { signal }),
};
