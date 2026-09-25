import { apiClient } from "../client";
import type { CreatePaymentDto, CreatePaymentResponseDto, PaymentDetailsResponseDto, PaymentsListResponseDto, TreasuryBalanceDto, TreasuryOpeningBalanceDto, TreasuryOpeningBalanceInputDto } from "../types";
export const paymentsService = {
  listForCustomer: (customerId: number, page = 1, limit = 20, signal?: AbortSignal) => apiClient.get<PaymentsListResponseDto>(`/customers/${customerId}/payments?page=${page}&limit=${limit}`, { signal }),
  getById: (id: number, signal?: AbortSignal) => apiClient.get<PaymentDetailsResponseDto["payment"]>(`/payments/${id}`, { signal }).then((payment): PaymentDetailsResponseDto => ({ message: "", payment })),
  createForCustomer: (customerId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/customers/${customerId}/payments`, data, { signal }),
  createDisbursement: (customerId: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.post<CreatePaymentResponseDto>(`/customers/${customerId}/disbursements`, data, { signal }),
  update: (id: number, data: CreatePaymentDto, signal?: AbortSignal) => apiClient.patch<CreatePaymentResponseDto>(`/payments/${id}`, data, { signal }),
  cancel: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/payments/${id}/cancel`, undefined, { signal }),
  collectCheck: (id: number, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/payments/${id}/check/collect`, undefined, { signal }),
  returnCheck: (id: number, return_reason?: string, signal?: AbortSignal) => apiClient.post<{ message: string }>(`/payments/${id}/check/return`, { return_reason }, { signal }),
  treasuryBalance: (signal?: AbortSignal) => apiClient.get<TreasuryBalanceDto>("/treasury/balance", { signal }),
  treasuryOpeningBalances: (signal?: AbortSignal) => apiClient.get<TreasuryOpeningBalanceDto[]>("/treasury/opening-balances", { signal }),
  createTreasuryOpeningBalance: (data: TreasuryOpeningBalanceInputDto, signal?: AbortSignal) => apiClient.post<{ message: string; treasury_entry_id: number }>("/treasury/opening-balance", data, { signal }),
  updateTreasuryOpeningBalance: (id: number, data: TreasuryOpeningBalanceInputDto, signal?: AbortSignal) => apiClient.patch<{ message: string; treasury_entry: TreasuryOpeningBalanceDto }>(`/treasury/opening-balances/${id}`, data, { signal }),
  cancelTreasuryOpeningBalance: (id: number, signal?: AbortSignal) => apiClient.delete<{ message: string }>(`/treasury/opening-balances/${id}`, { signal }),
};
