import { apiClient } from "../client";
import type { CreatePaymentDto, CreatePaymentResponseDto, PaymentDetailsResponseDto } from "../types";
export const paymentsService = {
  getById: (id: number, signal?: AbortSignal) => apiClient.get<PaymentDetailsResponseDto["payment"]>(`/payments/${id}`, { signal }).then((payment): PaymentDetailsResponseDto => ({ message: "", payment })),
  createReceipt: (accountId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/accounts/${accountId}/payments`, data, { signal }),
  createDisbursement: (accountId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/accounts/${accountId}/disbursements`, data, { signal }),
  update: (id: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.patch<CreatePaymentResponseDto>(`/payments/${id}`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/payments/${id}/cancel`, undefined, { signal }),
};
