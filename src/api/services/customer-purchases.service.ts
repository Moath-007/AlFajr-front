import { apiClient } from "../client";
import type { CreateCustomerPurchaseDto, CreateCustomerPurchaseResponseDto, CustomerPurchaseDetailsResponseDto, CustomerPurchaseDto, CustomerPurchasesResponseDto, UpdateCustomerPurchaseDto } from "../types";
export const customerPurchasesService = {
  list: (signal?: AbortSignal) => apiClient.get<CustomerPurchaseDto[]>("/customer-purchases", { signal }).then((items): CustomerPurchasesResponseDto => ({ message: "", items })),
  getById: (id: number, signal?: AbortSignal) => apiClient.get<CustomerPurchaseDto>(`/customer-purchases/${id}`, { signal }).then((item): CustomerPurchaseDetailsResponseDto => ({ message: "", item })),
  create: (data: CreateCustomerPurchaseDto, signal?: AbortSignal) => apiClient.post<CreateCustomerPurchaseResponseDto>("/customer-purchases", data, { signal }),
  update: (id: number, data: UpdateCustomerPurchaseDto, signal?: AbortSignal) => apiClient.put<{ message: string }>(`/customer-purchases/${id}`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/customer-purchases/${id}/cancel`, undefined, { signal }),
};
