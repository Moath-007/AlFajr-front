import { accountsService } from "./accounts.service";
import { apiClient } from "../client";
import type {
  CreateAccountReturnDto,
  PurchaseReturnDto,
  SalesReturnDto,
  SalesReturnInput,
  ReturnVariant,
  ReturnsQuery,
  PaginationResponseDto,
} from "../types";
export const returnsService = {
  permanentDeletePurchase: (id: number) =>
    apiClient.delete<{ message: string }>(`/purchase-returns/${id}/permanent`),
  list: (query: ReturnsQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== "") params.set(key, String(value));
    return apiClient.get<{
      items: SalesReturnDto[];
      pagination: PaginationResponseDto;
    }>(`/returns?${params}`, { signal });
  },
  details: (id: number, signal?: AbortSignal) =>
    apiClient.get<SalesReturnDto>(`/returns/${id}`, { signal }),
  accounts: (signal?: AbortSignal) =>
    accountsService.allOptions({ type: "General" }, signal),
  variants: (query: { search?: string; page?: number; limit?: number } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
    return apiClient.get<{ items: ReturnVariant[]; page: number; has_more: boolean }>(`/returns/variants?${params}`, { signal });
  },
  create: (data: SalesReturnInput) =>
    apiClient.post<SalesReturnDto>("/returns", data),
  edit: (id: number, data: SalesReturnInput) =>
    apiClient.put<SalesReturnDto>(`/returns/${id}`, data),
  cancel: (id: number, note?: string) =>
    apiClient.post<SalesReturnDto>(`/returns/${id}/cancel`, { note }),
  restore: (id: number, note?: string) =>
    apiClient.post<SalesReturnDto>(`/returns/${id}/restore`, { note }),
  permanentDelete: (id: number) =>
    apiClient.delete<{ message: string }>(`/returns/${id}/permanent`),
  listPurchase: (query: ReturnsQuery = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== "") params.set(key, String(value));
    return apiClient.get<{
      items: PurchaseReturnDto[];
      pagination: PaginationResponseDto;
    }>(`/purchase-returns?${params}`, { signal });
  },
  editPurchase: (id: number, data: CreateAccountReturnDto) =>
    apiClient.put<PurchaseReturnDto>(`/purchase-returns/${id}`, data),
  restorePurchase: (id: number) =>
    apiClient.post<PurchaseReturnDto>(`/purchase-returns/${id}/restore`),
  purchaseDetails: (id: number, signal?: AbortSignal) =>
    apiClient.get<PurchaseReturnDto>(`/purchase-returns/${id}`, { signal }),
  createPurchaseForAccount: (
    data: CreateAccountReturnDto,
    signal?: AbortSignal,
  ) =>
    apiClient.post<{
      message: string;
      return_id: number;
      total_amount: string;
    }>("/purchase-returns/account", data, { signal }),
  cancelPurchase: (id: number) =>
    apiClient.post<PurchaseReturnDto>(`/purchase-returns/${id}/cancel`),
};
