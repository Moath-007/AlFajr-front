import { apiClient } from '../client';
import type {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from '../types';

export const categoriesService = {
  list: (signal?: AbortSignal) =>
    apiClient.get<CategoryResponseDto[]>('/categories/internal', { signal }),
  listPublic: (signal?: AbortSignal) =>
    apiClient.get<CategoryResponseDto[]>('/categories/public', { signal }),
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
  if (data.is_visible_online !== undefined) form.append('is_visible_online', String(data.is_visible_online));
  if (data.image) form.append('image', data.image);
  if (data.remove_image) form.append('remove_image', 'true');
  return form;
}
