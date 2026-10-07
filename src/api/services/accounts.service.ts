import { apiClient } from "../client";
import type {
  AccountIdentity,
  AccountIdentityEdit,
  AccountIdentityInput,
  AccountIdentityList,
  AccountIdentityOption,
  AccountIdentityOptions,
  AccountsQuery,
  AccountFinancialDetail,
  AccountFinancialDocument,
  OpeningBalanceInput,
  AccountDiscountInput,
  AccountMovementQuery,
  EffectiveAccountStatement,
} from "../types/accounts";
const queryString = (query: AccountsQuery | AccountMovementQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  return params.size ? `?${params}` : "";
};
export const accountsService = {
  allOptions: async (
    query: Omit<AccountsQuery, "page" | "limit"> = {},
    signal?: AbortSignal,
  ): Promise<AccountIdentityOption[]> => {
    const items: AccountIdentityOption[] = [];
    let page = 1;
    while (true) {
      const response = await accountsService.options(
        { ...query, page, limit: 100 },
        signal,
      );
      items.push(...response.items);
      if (page >= response.pagination.total_pages) return items;
      page++;
    }
  },
  list: (query: AccountsQuery = {}, signal?: AbortSignal) =>
    apiClient.get<AccountIdentityList>(`/accounts${queryString(query)}`, {
      signal,
    }),
  options: (query: AccountsQuery = {}, signal?: AbortSignal) =>
    apiClient.get<AccountIdentityOptions>(
      `/accounts/options${queryString(query)}`,
      { signal },
    ),
  create: (input: AccountIdentityInput) =>
    apiClient.post<AccountIdentity>("/accounts", input),
  edit: (id: number, input: AccountIdentityEdit) =>
    apiClient.patch<AccountIdentity>(`/accounts/${id}`, input),
  remove: (id: number) =>
    apiClient.delete<{
      deleted_account_id: number;
      deleted_clearing_account_ids: number[];
    }>(`/accounts/${id}`),
  financialDetail: (
    id: number,
    query: AccountMovementQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<AccountFinancialDetail>(
      `/accounts/${id}/financial-details${queryString(query)}`,
      { signal },
    ),
  createOpening: (id: number, data: OpeningBalanceInput) =>
    apiClient.post<AccountFinancialDocument>(
      `/accounts/${id}/opening-balance`,
      data,
    ),
  editOpening: (id: number, data: OpeningBalanceInput) =>
    apiClient.put<AccountFinancialDocument>(
      `/accounts/${id}/opening-balance`,
      data,
    ),
  cancelOpening: (id: number) =>
    apiClient.post<AccountFinancialDocument>(
      `/accounts/${id}/opening-balance/cancel`,
    ),
  discounts: (
    id: number,
    query: AccountMovementQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<{
      items: AccountFinancialDocument[];
      pagination: AccountIdentityList["pagination"];
    }>(`/accounts/${id}/discounts${queryString(query)}`, { signal }),
  discount: (id: number, signal?: AbortSignal) =>
    apiClient.get<AccountFinancialDocument>(`/account-discounts/${id}`, {
      signal,
    }),
  createDiscount: (id: number, data: AccountDiscountInput) =>
    apiClient.post<AccountFinancialDocument>(`/accounts/${id}/discounts`, data),
  editDiscount: (id: number, data: AccountDiscountInput) =>
    apiClient.put<AccountFinancialDocument>(`/account-discounts/${id}`, data),
  cancelDiscount: (id: number) =>
    apiClient.post<AccountFinancialDocument>(`/account-discounts/${id}/cancel`),
  deleteDiscount: (id: number) =>
    apiClient.delete<{ deleted_document_id: number }>(
      `/account-discounts/${id}/permanent`,
    ),
  statement: (
    id: number,
    query: AccountMovementQuery = {},
    signal?: AbortSignal,
  ) =>
    apiClient.get<EffectiveAccountStatement>(
      `/accounts/${id}/statement${queryString(query)}`,
      { signal },
    ),
};
