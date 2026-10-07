import { apiClient } from '../client';
import type { CashAccountDto, LedgerAccount, TreasuryOverview, VoucherInput } from '../types/ledger';

export const ledgerService = {
  accounts: (signal?: AbortSignal) => apiClient.get<LedgerAccount[]>('/ledger/accounts', { signal }),
  cashAccounts: (signal?: AbortSignal) => apiClient.get<CashAccountDto[]>('/ledger/cash-accounts', { signal }),
  treasury: (signal?: AbortSignal, range: { from?: string; to?: string } = {}) => {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    return apiClient.get<TreasuryOverview>(`/ledger/treasury${params.size ? `?${params}` : ''}`, { signal });
  },
  voucher: (input: VoucherInput) => apiClient.post('/ledger/vouchers', input),
};
