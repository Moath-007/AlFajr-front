import { accountsService } from './accounts.service';
import { apiClient } from "../client";
import type {
  CreateAccountReturnDto,
  CreateReturnDto,
  PurchaseReturnDto,
  SalesReturnDto,
  SalesReturnInput,
  ReturnVariant,
  ReturnsQuery,
  PaginationResponseDto,
} from "../types";
export const returnsService = {
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
  accounts: (signal?: AbortSignal) => accountsService.allOptions({ type: 'General' }, signal),
  variants: (signal?: AbortSignal) =>
    apiClient.get<ReturnVariant[]>("/returns/variants", { signal }),
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
  listPurchase: (accountId?: number) =>
    apiClient.get<PurchaseReturnDto[]>(
      `/purchase-returns${accountId ? `?account_id=${accountId}` : ""}`,
    ),
  createPurchase: (
    purchaseId: number,
    data: CreateReturnDto,
    signal?: AbortSignal,
  ) =>
    apiClient.post<{
      message: string;
      return_id: number;
      total_amount: string;
    }>(`/purchases/${purchaseId}/returns`, data, { signal }),
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
    apiClient.post<{ message: string }>(`/purchase-returns/${id}/cancel`),
};
