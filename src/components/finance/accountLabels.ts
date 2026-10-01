import type { LedgerAccount } from '@/api';

const internalKinds = new Set([
  'CheckHolding', 'Clearing', 'OnlineSales', 'StoreSales', 'Returns',
  'Revenue', 'PurchaseOffset', 'Equity', 'DebtOffset', 'Expense',
]);
export const isInternalAccount = (account: LedgerAccount) =>
  internalKinds.has(account.kind) || (account.is_system && account.kind !== 'Cash' && account.kind !== 'Bank');

export const accountKindLabel: Record<string, string> = {
  Party: 'جهة', Bank: 'بنك', Cash: 'نقد', CheckHolding: 'شيكات بحوزتنا', Clearing: 'حساب التحصيل',
  OnlineSales: 'بيع الأونلاين الموحد', StoreSales: 'بيع المفرق الموحد', Returns: 'مردودات',
  Revenue: 'إيراد', PurchaseOffset: 'مقابل مشتريات', Equity: 'رأس المال الافتتاحي',
};

export function balanceMeaning(account: LedgerAccount, value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return 'الرصيد متعادل';
  if (['Cash', 'CheckHolding', 'Clearing', 'Bank'].includes(account.kind)) return amount > 0 ? 'أموال ضمن إجمالي الخزنة' : 'رصيد سالب يحتاج مراجعة';
  if (['Party', 'OnlineSales', 'StoreSales'].includes(account.kind)) return amount > 0 ? 'مستحق لنا' : 'مستحق للجهة';
  return amount > 0 ? 'رصيد مدين' : 'رصيد دائن';
}
