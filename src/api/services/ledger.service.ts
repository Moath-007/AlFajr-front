import { apiClient } from '../client';
import type { AccountStatement, CashAccountDto, LedgerAccount, SaleAccountOption, TreasuryOverview, TreasuryStatement, VoucherInput } from '../types/ledger';

export const ledgerService = {
  accounts: (signal?: AbortSignal) => apiClient.get<LedgerAccount[]>('/ledger/accounts', { signal }),
  saleAccounts: (signal?: AbortSignal) => apiClient.get<SaleAccountOption[]>('/ledger/sale-accounts', { signal }),
  cashAccounts: (signal?: AbortSignal) => apiClient.get<CashAccountDto[]>('/ledger/cash-accounts', { signal }),
  createAccount: (input: { name: string; kind: 'General' | 'Bank' | 'Cash' }) => apiClient.post<LedgerAccount>('/ledger/accounts', input),
  renameAccount: (id: number, name: string) => apiClient.patch<LedgerAccount>(`/ledger/accounts/${id}`, { name }),
  deleteAccount: (id: number) => apiClient.delete<{ message: string; deleted_account_id: number; deleted_clearing_account_ids: number[] }>(`/ledger/accounts/${id}`),
  statement: (id: number, from?: string, to?: string, signal?: AbortSignal) => {
    const query = new URLSearchParams();
    if (from) query.set('from', `${from}T00:00:00.000Z`);
    if (to) query.set('to', `${to}T23:59:59.999Z`);
    return apiClient.get<AccountStatement>(`/ledger/accounts/${id}/statement${query.size ? `?${query}` : ''}`, { signal });
  },
  treasury: (signal?: AbortSignal) => apiClient.get<TreasuryOverview>('/ledger/treasury', { signal }),
  treasuryStatement: (signal?: AbortSignal) => apiClient.get<TreasuryStatement>('/ledger/treasury/statement', { signal }),
  voucher: (input: VoucherInput) => apiClient.post('/ledger/vouchers', input),
};
