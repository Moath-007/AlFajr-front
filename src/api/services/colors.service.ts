import { apiClient } from '../client';
import type { ColorResponseDto, CreateColorDto } from '../types';

export const colorsService = {
  list: (signal?: AbortSignal) =>
    apiClient.get<ColorResponseDto[]>('/colors', { signal }),
  create: (data: CreateColorDto, signal?: AbortSignal) =>
    apiClient.post<ColorResponseDto>('/colors', data, { signal }),
};
