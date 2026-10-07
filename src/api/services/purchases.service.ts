import { apiClient } from '../client';
import type { CreateAccountPurchaseDto, CreatePurchaseResponseDto, PurchaseDto, UpdatePurchaseDto, PurchasesQuery, PurchasesListResponse } from '../types';

export const purchasesService = {
  list: (query: PurchasesQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
    return apiClient.get<PurchasesListResponse>(`/purchases?${params}`, {signal});
  },
  getById: (id: number, signal?: AbortSignal) => apiClient.get<PurchaseDto>(`/purchases/${id}`, { signal }),
  createForAccount: (data: CreateAccountPurchaseDto) => apiClient.post<CreatePurchaseResponseDto>('/purchases', data),
  update: (id: number, data: UpdatePurchaseDto) => apiClient.put<{ message: string }>(`/purchases/${id}`, data),
  cancel: (id: number) => apiClient.post<{ message: string }>(`/purchases/${id}/cancel`),
  restore: (id: number) => apiClient.post<{ message: string }>(`/purchases/${id}/restore`),
  permanentDelete: (id: number) => apiClient.delete<{ message: string }>(`/purchases/${id}/permanent`),
};
