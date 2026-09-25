import { apiClient } from "../client";
import type {
  CustomerBalanceResponseDto,
  CustomerStatementQuery,
  CustomerStatementResponseDto,
  CustomersListResponseDto,
  CustomersQuery,
  CustomerSelectionDto,
  ManageCustomerDto,
  CreateCustomerDebtDto,
  CustomerDebtsResponseDto,
  CustomerAccountsResponseDto,
  CustomerOpeningBalanceDto,
  CustomerOpeningBalanceInputDto,
} from "../types";

const queryString = (query: CustomersQuery | CustomerStatementQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
};

export const customersService = {
  create: (data: ManageCustomerDto, signal?: AbortSignal) => apiClient.post<{ message: string; customer: CustomerSelectionDto }>("/customers", data, { signal }),
  update: (customerId: number, data: ManageCustomerDto, signal?: AbortSignal) => apiClient.put<{ message: string; customer: CustomerSelectionDto }>(`/customers/${customerId}`, data, { signal }),
  list: (query: CustomersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<CustomersListResponseDto>(`/customers${queryString(query)}`, {
      signal,
    }),
  accounts: (query: CustomersQuery = {}, signal?: AbortSignal) => apiClient.get<CustomerAccountsResponseDto>(`/customers/accounts${queryString(query)}`, { signal }),
  findByPhone: (phone: string, signal?: AbortSignal) =>
    apiClient.get<CustomerBalanceResponseDto>(
      `/customers/by-phone?phone=${encodeURIComponent(phone)}`,
      { signal },
    ),
  statement: (
    customerId: number,
    query: CustomerStatementQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<CustomerStatementResponseDto>(
      `/customers/${customerId}/statement${queryString(query)}`,
      { signal },
    ),
  listDebts: (customerId: number, signal?: AbortSignal) => apiClient.get<CustomerDebtsResponseDto>(`/customers/${customerId}/debts?page=1&limit=100`, { signal }),
  createDebt: (customerId: number, data: CreateCustomerDebtDto, signal?: AbortSignal) => apiClient.post<{ message: string; customer_debt_id: number }>(`/customers/${customerId}/debts`, data, { signal }),
  updateDebt: (debtId: number, data: CreateCustomerDebtDto, signal?: AbortSignal) => apiClient.put<{ message: string }>(`/customers/debts/${debtId}`, data, { signal }),
  cancelDebt: (debtId: number, signal?: AbortSignal) => apiClient.delete<{ message: string }>(`/customers/debts/${debtId}`, { signal }),
  listOpeningBalances: (customerId: number, signal?: AbortSignal) => apiClient.get<CustomerOpeningBalanceDto[]>(`/customers/${customerId}/opening-balances`, { signal }),
  createOpeningBalance: (customerId: number, data: CustomerOpeningBalanceInputDto, signal?: AbortSignal) => apiClient.post<{ message: string; opening_balance_id: number }>(`/customers/${customerId}/opening-balance`, data, { signal }),
  updateOpeningBalance: (id: number, data: CustomerOpeningBalanceInputDto, signal?: AbortSignal) => apiClient.put<{ message: string; opening_balance: CustomerOpeningBalanceDto }>(`/customers/opening-balances/${id}`, data, { signal }),
  cancelOpeningBalance: (id: number, signal?: AbortSignal) => apiClient.delete<{ message: string }>(`/customers/opening-balances/${id}`, { signal }),
};
