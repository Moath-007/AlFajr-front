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
export function balanceMeaning(value: string, kind: UserAccountKind) {
  const n = Number(value);
  if (n === 0) return 'الرصيد صفر';
  return kind === 'General'
    ? n < 0
      ? 'مستحق لنا على الحساب'
      : 'مستحق للحساب علينا'
    : n > 0
      ? 'رصيد مدين'
      : 'رصيد دائن';
}

export function statementAmount(value: string, mode: 'balance' | 'change') {
  const amount = Number(value);
  if (mode === 'balance') return (amount > 0 ? '+' : amount < 0 ? '-' : '') + formatMoney(Math.abs(amount));
  const label = amount === 0 ? '' : amount > 0 ? 'زيادة' : 'دائن';
  return formatMoney(Math.abs(amount)) + (label ? ' · ' + label : '');
}

export function accountAmountColor(value: string, side: 'balance' | 'debit' | 'credit' = 'balance') {
  const amount = Number(value);
  if (amount === 0) return 'text-stone-400';
  return side === 'debit' || (side === 'balance' && amount < 0) ? 'text-red-700' : 'text-green-700';
}