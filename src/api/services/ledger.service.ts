import { apiClient } from '../client';
import type { CashAccountDto, LedgerAccount, TreasuryOverview, VoucherInput } from '../types/ledger';

export const ledgerService = {
  accounts: (signal?: AbortSignal) => apiClient.get<LedgerAccount[]>('/ledger/accounts', { signal }),
  cashAccounts: (signal?: AbortSignal) => apiClient.get<CashAccountDto[]>('/ledger/cash-accounts', { signal }),
  treasury: (signal?: AbortSignal) => apiClient.get<TreasuryOverview>('/ledger/treasury', { signal }),
  voucher: (input: VoucherInput) => apiClient.post('/ledger/vouchers', input),
};
