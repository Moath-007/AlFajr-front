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
    apiClient.post<CategoryResponseDto>('/categories', categoryFormData(data), { signal }),
  update: (id: number, data: UpdateCategoryDto, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponseDto>(`/categories/${id}`, categoryFormData(data), { signal }),
  updateStatus: (id: number, data: UpdateCategoryStatusDto, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponseDto>(`/categories/${id}/status`, data, { signal }),
  delete: (id: number, signal?: AbortSignal) =>
    apiClient.delete<CategoryResponseDto>(`/categories/${id}`, { signal }),
};

function categoryFormData(data: CreateCategoryDto & { remove_image?: boolean }) {
  const form = new FormData();
  form.append('name', data.name);
  if (data.image) form.append('image', data.image);
  if (data.remove_image) form.append('remove_image', 'true');
  return form;
}
