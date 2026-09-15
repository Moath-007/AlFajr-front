import type { ApiOrderStatus, PaymentStatus } from '@/api';

export function OrderStatusBadge({ status }: { status: ApiOrderStatus }) {
  const styles = status === 'Pending' ? 'bg-amber-100 text-amber-800' : status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700';
  const label = status === 'Pending' ? 'قيد الانتظار' : status === 'Completed' ? 'مكتمل' : 'ملغي';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${styles}`}>{label}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles = status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : status === 'PartiallyPaid' ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-700';
  const label = status === 'Paid' ? 'مدفوع' : status === 'PartiallyPaid' ? 'مدفوع جزئيًا' : 'غير مدفوع';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${styles}`}>{label}</span>;
}
