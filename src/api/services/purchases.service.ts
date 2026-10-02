import { apiClient } from '../client';
import type { CreateAccountPurchaseDto, CreatePurchaseResponseDto, PurchaseDto, UpdatePurchaseDto } from '../types';

export const purchasesService = {
  list: (signal?: AbortSignal) => apiClient.get<PurchaseDto[]>('/purchases', { signal }),
  getById: (id: number, signal?: AbortSignal) => apiClient.get<PurchaseDto>(`/purchases/${id}`, { signal }),
  createForAccount: (data: CreateAccountPurchaseDto) => apiClient.post<CreatePurchaseResponseDto>('/purchases', data),
  update: (id: number, data: UpdatePurchaseDto) => apiClient.put<{ message: string }>(`/purchases/${id}`, data),
  cancel: (id: number) => apiClient.post<{ message: string }>(`/purchases/${id}/cancel`),
};
