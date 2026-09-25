import { apiClient } from "../client";
import type { CreateDirectReturnDto, CreateReturnDto, CustomerReturnDto, ReturnType } from "../types";

export const returnsService = {
  list: (query: { customer_id?: number; type?: ReturnType } = {}, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (query.customer_id) params.set("customer_id", String(query.customer_id));
    if (query.type) params.set("type", query.type);
    return apiClient.get<CustomerReturnDto[]>(`/returns${params.size ? `?${params}` : ""}`, { signal });
  },
  details: (id: number, signal?: AbortSignal) => apiClient.get<CustomerReturnDto>(`/returns/${id}`, { signal }),
  createSales: (orderId: number, data: CreateReturnDto, signal?: AbortSignal) => apiClient.post<{ message: string; return_id: number; total_amount: string }>(`/orders/${orderId}/returns`, data, { signal }),
  createPurchase: (purchaseId: number, data: CreateReturnDto, signal?: AbortSignal) => apiClient.post<{ message: string; return_id: number; total_amount: string }>(`/customer-purchases/${purchaseId}/returns`, data, { signal }),
  createDirect: (customerId: number, data: CreateDirectReturnDto, signal?: AbortSignal) => apiClient.post<{ message: string; return_id: number; total_amount: string }>(`/customers/${customerId}/returns`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/returns/${id}/cancel`, undefined, { signal }),
};
