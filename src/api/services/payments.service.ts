import { apiClient } from "../client";
import type { CreatePaymentDto, CreatePaymentResponseDto, PaymentDetailsResponseDto, PaymentsListResponseDto } from "../types";
export const paymentsService = {
  listForAccount: (accountId: number, page = 1, limit = 20, signal?: AbortSignal) => apiClient.get<PaymentsListResponseDto>(`/accounts/${accountId}/payments?page=${page}&limit=${limit}`, { signal }),
  getById: (id: number, signal?: AbortSignal) => apiClient.get<PaymentDetailsResponseDto["payment"]>(`/payments/${id}`, { signal }).then((payment): PaymentDetailsResponseDto => ({ message: "", payment })),
  createReceipt: (accountId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/accounts/${accountId}/payments`, data, { signal }),
  createDisbursement: (accountId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/accounts/${accountId}/disbursements`, data, { signal }),
  createAccountCheck: (accountId: number, type: "Receipt" | "Disbursement", data: CreatePaymentDto, signal?: AbortSignal) =>
    apiClient.post<CreatePaymentResponseDto>(`/accounts/${accountId}/${type === "Receipt" ? "check-receipts" : "check-disbursements"}`, data, { signal }),
  update: (id: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.patch<CreatePaymentResponseDto>(`/payments/${id}`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/payments/${id}/cancel`, undefined, { signal }),
};
