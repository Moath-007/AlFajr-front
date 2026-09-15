import { apiClient } from "../client";
import type {
  CustomerBalanceResponseDto,
  CustomerStatementQuery,
  CustomerStatementResponseDto,
  CustomersListResponseDto,
  CustomersQuery,
  CustomerSettlementDto,
  CustomerSettlementResponseDto,
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
  list: (query: CustomersQuery = {}, signal?: AbortSignal) =>
    apiClient.get<CustomersListResponseDto>(`/customers${queryString(query)}`, {
      signal,
    }),
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
  settle: (customerId: number, data: CustomerSettlementDto, signal?: AbortSignal) =>
    apiClient.post<CustomerSettlementResponseDto>(`/customers/${customerId}/settlements`, data, { signal }),
};
