import { apiClient } from "../client";
import type { WriteOffInputDto, WriteOffsResponseDto } from "../types";
export const writeOffsService = {
  list: (customerId: number, page = 1, limit = 20, signal?: AbortSignal) => apiClient.get<WriteOffsResponseDto>(`/customers/${customerId}/write-offs?page=${page}&limit=${limit}`, { signal }),
  create: (customerId: number, data: WriteOffInputDto, signal?: AbortSignal) => apiClient.post<{ message: string; write_off_id: number }>(`/customers/${customerId}/write-offs`, data, { signal }),
  update: (id: number, data: WriteOffInputDto, signal?: AbortSignal) => apiClient.put<{ message: string }>(`/write-offs/${id}`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/write-offs/${id}/cancel`, undefined, { signal }),
};
