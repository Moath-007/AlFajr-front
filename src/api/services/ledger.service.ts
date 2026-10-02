import { apiClient } from '../client';
import type { CashAccountDto, LedgerAccount, SaleAccountOption, TreasuryOverview, TreasuryStatement, VoucherInput } from '../types/ledger';

export const ledgerService = {
  accounts: (signal?: AbortSignal) => apiClient.get<LedgerAccount[]>('/ledger/accounts', { signal }),
  saleAccounts: (signal?: AbortSignal) => apiClient.get<SaleAccountOption[]>('/ledger/sale-accounts', { signal }),
  cashAccounts: (signal?: AbortSignal) => apiClient.get<CashAccountDto[]>('/ledger/cash-accounts', { signal }),
  treasury: (signal?: AbortSignal) => apiClient.get<TreasuryOverview>('/ledger/treasury', { signal }),
  treasuryStatement: (signal?: AbortSignal) => apiClient.get<TreasuryStatement>('/ledger/treasury/statement', { signal }),
  voucher: (input: VoucherInput) => apiClient.post('/ledger/vouchers', input),
};
