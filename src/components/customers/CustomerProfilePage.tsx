import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customersService, paymentsService, returnsService, type CustomerReturnDto, type CustomerSelectionDto, type PaymentDto } from '@/api';
import { useAuth } from '@/auth';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { formatMoney } from '@/utils/money';

export default function CustomerProfilePage({ customerId }: { customerId: number }) {
  const { user } = useAuth(); const admin = user?.role === 'Admin'; const base = admin ? '/owner' : '/rep';
  const [customer, setCustomer] = useState<CustomerSelectionDto | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]); const [returns, setReturns] = useState<CustomerReturnDto[]>([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const first = await customersService.list({ page: 1, limit: 100 });
      let found = first.customers.find((row) => row.customer_id === customerId);
      for (let page = 2; !found && page <= first.pagination.total_pages; page++) {
        const next = await customersService.list({ page, limit: 100 });
        found = next.customers.find((row) => row.customer_id === customerId);
      }
      if (!found) throw new Error('الجهة غير موجودة');
      setCustomer(found);
      const [b, p, r] = await Promise.all([customersService.findByPhone(found.phone), paymentsService.listForCustomer(customerId, 1, 100), returnsService.list({ customer_id: customerId })]);
      setBalance(b.customer.balance); setPayments(p.items); setReturns(r);
    } catch (reason) { setError(apiMessages(reason, 'تعذر تحميل بيانات الجهة.').join('، ')); }
    finally { setLoading(false); }
  }, [customerId]);
  useEffect(() => { void load(); }, [load]);
  if (loading && !customer) return <p className="p-6" dir="rtl">جارٍ تحميل بيانات الجهة…</p>;
  return <div className="space-y-5" dir="rtl"><Link className="text-sm font-bold text-gold-dark" to={`${base}/customers`}>← الجهات</Link>{error && <div className="rep-error">{error} <button className="underline" onClick={() => void load()}>إعادة المحاولة</button></div>}{customer && <><header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">{customer.name}</h1><p className="text-stone-500">{customer.phone} · جهة #{customer.customer_id}</p><p className="mt-3 text-xl font-black">{balance === null ? 'رصيد حساب الطرف غير متاح' : `رصيد حساب الطرف: ${formatMoney(Math.abs(Number(balance)))} · ${Number(balance) > 0 ? 'مدين' : Number(balance) < 0 ? 'دائن' : 'متوازن'}`}</p></header>
    <div className="flex flex-wrap gap-2"><Link className="btn-primary" to={`${base}/customers/${customerId}/statement`}>كشف الحساب</Link><Link className="btn-outline" to={`${base}/payments?customer=${customerId}`}>قبض أو صرف</Link><Link className="btn-outline" to={`${base}/customer-purchases`}>المشتريات</Link></div>
    <section className="rounded-2xl border bg-white p-4"><h2 className="mb-3 text-lg font-black text-brand">القبض والصرف</h2><div className="space-y-2">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>#{payment.id} · {payment.payment_type === 'Receipt' ? 'قبض' : 'صرف'} · {payment.payment_method === 'Check' ? 'شيك' : 'نقد'} · {new Date(payment.paid_at).toLocaleDateString('ar-EG')}</span><b>{formatMoney(payment.base_amount ?? payment.amount)}</b></div>)}</div>{!payments.length && <p className="text-stone-500">لا توجد سندات.</p>}</section>
    <section className="rounded-2xl border bg-white p-4"><h2 className="mb-3 text-lg font-black text-brand">المردودات</h2><div className="space-y-2">{returns.map((row) => <div key={row.customer_return_id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>#{row.customer_return_id} · {row.return_type === 'SalesReturn' ? 'مردود بيع' : 'مردود شراء'} · {new Date(row.created_at).toLocaleDateString('ar-EG')}</span><b>{formatMoney(row.total_amount)}</b></div>)}</div>{!returns.length && <p className="text-stone-500">لا توجد مردودات.</p>}</section>
  </>}</div>;
}
