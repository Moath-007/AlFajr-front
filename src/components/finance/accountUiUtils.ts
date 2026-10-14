import { formatMoney } from '@/components/rep/repOrderUtils';
import type { AccountMovementType, UserAccountKind } from '@/api';
export const accountKindLabels: Record<UserAccountKind, string> = {
  General: 'عام',
  Cash: 'صندوق',
  Bank: 'بنك',
};
export const movementLabels: Record<AccountMovementType, string> = {
  Opening: 'رصيد افتتاحي',
  Sale: 'مبيعات',
  Purchase: 'مشتريات',
  SalesReturn: 'مردود مبيعات',
  PurchaseReturn: 'مردود مشتريات',
  Receipt: 'قبض',
  Disbursement: 'صرف',
  CheckMovement: 'حركة شيك',
  AccountDiscount: 'خصم على الحساب',
  Journal: 'سند يدوي / تحويل',
  Reversal: 'إلغاء أثر سابق',
  Other: 'حركات أخرى',
};
export function businessToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hebron',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function currentMonth() {
  const to = businessToday();
  return { from: to.slice(0, 7) + '-01', to };
}

export function statementAmount(value: string, mode: 'balance' | 'change') {
  const amount = Number(value);
  if (mode === 'balance') return (amount > 0 ? '+' : amount < 0 ? '-' : '') + formatMoney(Math.abs(amount));
  const label = amount === 0 ? '' : amount > 0 ? 'زيادة' : 'دائن';
  return formatMoney(Math.abs(amount)) + (label ? ' · ' + label : '');
}

export function accountAmountColor(value: string, side: 'balance' | 'debit' | 'credit' = 'balance', kind: UserAccountKind = 'General') {
  const amount = Number(value);
  if (amount === 0) return 'text-stone-400';
  const debit = side === 'debit' || (side === 'balance' && (kind === 'General' ? amount < 0 : amount > 0));
  return debit ? 'text-red-600' : 'text-emerald-700';
}
export const financialDirectionLabels = {
  Debit: 'مستحق لنا على الحساب (مدين)',
  Credit: 'مستحق للحساب علينا (دائن)',
  ReduceReceivable: 'تخفيض ما يدين به الحساب لنا',
  ReducePayable: 'تخفيض ما ندين به للحساب',
};
