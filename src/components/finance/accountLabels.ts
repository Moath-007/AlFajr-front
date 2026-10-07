import type { LedgerAccount } from '@/api';

const internalKinds = new Set([
  'CheckHolding', 'Clearing', 'OnlineSales', 'StoreSales', 'Returns',
  'Revenue', 'PurchaseOffset', 'Equity', 'DebtOffset', 'Expense',
]);
export const isInternalAccount = (account: Pick<LedgerAccount, 'kind' | 'is_system'>) =>
  internalKinds.has(account.kind) || account.is_system;

export const accountKindLabel: Record<string, string> = {
  Bank: 'بنك', Cash: 'نقد', CheckHolding: 'شيكات بحوزتنا', Clearing: 'حساب التحصيل',
  OnlineSales: 'بيع الأونلاين الموحد', StoreSales: 'بيع المفرق الموحد', Returns: 'مردودات',
  Revenue: 'إيراد', PurchaseOffset: 'مقابل مشتريات', Equity: 'رأس المال الافتتاحي',
};
