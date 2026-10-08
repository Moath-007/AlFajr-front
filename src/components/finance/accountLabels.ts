import type { LedgerAccount } from '@/api';

const internalKinds = new Set([
  'CheckHolding', 'Clearing', 'OnlineSales', 'StoreSales', 'Returns',
  'Revenue', 'PurchaseOffset', 'Equity', 'DebtOffset', 'Expense',
]);
export const isInternalAccount = (account: Pick<LedgerAccount, 'kind' | 'is_system'>) =>
  internalKinds.has(account.kind) || account.is_system;

