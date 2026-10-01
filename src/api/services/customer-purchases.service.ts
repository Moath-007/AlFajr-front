import { apiClient } from '../client';
import type { CreateAccountPurchaseDto, CreateCustomerPurchaseDto, CreateCustomerPurchaseResponseDto, CustomerPurchaseDto, CustomerPurchasePaymentInputDto, UpdateCustomerPurchaseDto } from '../types';

export const customerPurchasesService = {
  list: (signal?: AbortSignal) => apiClient.get<CustomerPurchaseDto[]>('/customer-purchases', { signal }),
  getById: (id: number, signal?: AbortSignal) => apiClient.get<CustomerPurchaseDto>(`/customer-purchases/${id}`, { signal }),
  create: (data: CreateCustomerPurchaseDto) => apiClient.post<CreateCustomerPurchaseResponseDto>('/customer-purchases', data),
  createForAccount: (data: CreateAccountPurchaseDto) => apiClient.post<CreateCustomerPurchaseResponseDto>('/customer-purchases/account', data),
  update: (id: number, data: UpdateCustomerPurchaseDto) => apiClient.put<{ message: string }>(`/customer-purchases/${id}`, data),
  addPayment: (id: number, data: CustomerPurchasePaymentInputDto) => apiClient.post<{ message: string; payment_id: number; customer_balance: string }>(`/customer-purchases/${id}/payments`, data),
  cancel: (id: number) => apiClient.post<{ message: string }>(`/customer-purchases/${id}/cancel`),
};
