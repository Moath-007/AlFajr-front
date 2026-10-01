import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Banknote, Boxes, ClipboardList, FileText, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { dashboardService, type AdminDashboardResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { OrderStatusBadge } from '@/components/rep/RepOrderUi';
import { apiMessages, formatMoney, formatOrderDate } from '@/components/rep/repOrderUtils';
import { Skeleton } from '@/components/ui/Skeleton';

const quickLinks = [
  { path: 'orders', label: 'الطلبات', icon: ClipboardList },
  { path: 'vouchers', label: 'السندات', icon: FileText },
  { path: 'customers', label: 'العملاء', icon: Users },
  { path: 'accounts', label: 'الحسابات', icon: Banknote },
  { path: 'checks', label: 'الشيكات', icon: Banknote },
  { path: 'inventory', label: 'المخزون', icon: Boxes },
];
const orderType = (value: string) => value === 'Retail' ? 'أونلاين' : value === 'Wholesale' ? 'جملة' : 'بيع مفرق';

export default function OwnerDashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [data, setData] = useState<AdminDashboardResponseDto | null>(null);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [query, setQuery] = useState<{ date_from?: string; date_to?: string; range?: 'current_month' | 'all_time' }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const load = useCallback((signal: AbortSignal) => {
    setLoading(true); setError('');
    dashboardService.get(query, signal).then((result) => { if (!signal.aborted) setData(result); })
      .catch((reason) => { if (!signal.aborted) setError(apiMessages(reason, 'تعذر تحميل لوحة التحكم.').join('، ')); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
  }, [query]);
  useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load, revision]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draftFrom && draftTo && draftFrom > draftTo) { setError('تاريخ البداية بعد النهاية.'); return; }
    setQuery({ date_from: draftFrom || undefined, date_to: draftTo || undefined, range: 'current_month' });
  };
  return <main className="mx-auto max-w-[1500px] space-y-6 pb-10" dir="rtl">
    <header className="rounded-3xl bg-brand px-5 py-6 text-white sm:px-8"><h1 className="text-3xl font-black">لوحة التحكم</h1>
      <p className="mt-2 text-sm text-white/80">ملخص مالي للفترة وتنبيهات تشغيلية للحالة الحالية.</p></header>
    <form onSubmit={apply} className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
      <RepDateInput label="من تاريخ" value={draftFrom} onChange={setDraftFrom} max={draftTo || undefined} />
      <RepDateInput label="إلى تاريخ" value={draftTo} onChange={setDraftTo} min={draftFrom || undefined} />
      <button className="btn-primary min-h-11">تطبيق</button>
      <button type="button" className="btn-outline min-h-11" onClick={() => { setDraftFrom(''); setDraftTo(''); setQuery({ range: 'all_time' }); }}>كل الوقت</button>
      <button type="button" className="btn-outline min-h-11" onClick={() => { setDraftFrom(''); setDraftTo(''); setQuery({}); }}>الشهر الحالي</button>
    </form>
    {error && <div className="rep-error" role="alert">{error} <button className="font-bold underline" onClick={() => setRevision((n) => n + 1)}>إعادة المحاولة <RefreshCw className="inline h-4 w-4" /></button></div>}
    {loading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>}
    {data && <>
      <section aria-label="المؤشرات المالية"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black text-brand">المؤشرات المالية</h2><p className="text-xs text-stone-600">المبيعات والتحصيلات: {data.period.date_from} إلى {data.period.date_to} · {data.period.timezone}. الأرصدة: الحالة الحالية. جميع المبالغ بالعملة الأساسية.</p></div><button className="text-sm font-bold text-gold-dark" onClick={() => onNavigate('reports')}>عرض التقارير ←</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="صافي المبيعات خلال الفترة" value={data.financial.net_sales_base} hint="نشاط قيود المبيعات والمردودات وعكوسها" icon={TrendingUp} />
          <Metric label="صافي التحصيلات خلال الفترة" value={data.financial.net_collections_base} hint="القبض والعكوس وتسويات الشيكات" icon={Banknote} />
          <Metric label="أرصدة العملاء المدينة الحالية" value={data.financial.party_debit_balances_base} hint="حسابات Party من دفتر الأستاذ" icon={Users} />
          <Metric label="أرصدة النقد والبنوك والشيكات الحالية" value={data.financial.treasury_base_balance} hint="Cash وBank وCheckHolding وClearing" icon={Banknote} />
        </div><p className="mt-2 text-xs text-stone-500">أرصدة العملاء الدائنة الحالية: {formatMoney(data.financial.party_credit_balances_base)} بالعملة الأساسية.</p>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border bg-white p-5"><h2 className="font-black text-brand">الطلبات الحالية</h2><p className="mt-1 text-xs text-stone-500">حالة المستندات الآن، بصرف النظر عن فلتر الفترة المالية.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['مكتملة', data.orders.completed], ['معلقة', data.orders.pending], ['ملغاة', data.orders.cancelled]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><b className="block text-xl">{value}</b><span className="text-xs">{label}</span></div>)}</div>
          {data.orders.pending_online > 0 && <button className="mt-3 w-full rounded-xl bg-amber-50 p-3 text-right text-sm font-bold text-amber-900" onClick={() => onNavigate('orders')}>{data.orders.pending_online} طلب أونلاين معلق بانتظار التأكيد ←</button>}
          <button className="mt-3 text-sm font-bold text-gold-dark" onClick={() => onNavigate('orders')}>عرض الطلبات ←</button>
        </section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="font-black text-brand">تنبيهات المخزون</h2><p className="mt-1 text-xs text-stone-500">من المخزون الحالي؛ المنخفض 1–{data.stock_alerts.low_threshold}.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['منخفض', data.stock_alerts.low], ['صفر', data.stock_alerts.out], ['سالب', data.stock_alerts.negative]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><b className="block text-xl">{value}</b><span className="text-xs">{label}</span></div>)}</div>
          <button className="mt-3 text-sm font-bold text-gold-dark" onClick={() => onNavigate('reports/inventory')}>عرض تقرير المخزون ←</button>
        </section>
        <section className="rounded-2xl border bg-white p-5"><h2 className="font-black text-brand">تنبيهات الشيكات</h2><p className="mt-1 text-xs text-stone-500">شيكات واردة في الخزنة أو البنك أو التحصيل؛ تصنيف تاريخي تقويمي.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">{[['مستحقة اليوم', data.check_alerts.due_today], ['متأخرة', data.check_alerts.overdue]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><b className="block text-xl">{value}</b><span className="text-xs">{label}</span></div>)}</div>
          <button className="mt-3 text-sm font-bold text-gold-dark" onClick={() => onNavigate('reports/checks')}>عرض تقرير الشيكات ←</button>
        </section>
      </div>
      <nav aria-label="روابط سريعة" className="flex flex-wrap gap-2">{quickLinks.map(({ path, label, icon: Icon }) => <button key={path} className="btn-outline inline-flex items-center gap-2" onClick={() => onNavigate(path)}><Icon className="h-4 w-4" />{label}</button>)}<button className="btn-primary" onClick={() => onNavigate('reports')}>كل التقارير ←</button></nav>
      <section className="rounded-2xl border bg-white"><div className="flex justify-between border-b p-5"><div><h2 className="font-black text-brand">آخر الطلبات</h2><p className="text-xs text-stone-500">أحدث المستندات المسجلة، لا نشاط Ledger.</p></div><button className="text-sm font-bold text-gold-dark" onClick={() => onNavigate('orders')}>عرض الكل ←</button></div>
        {data.recent_orders.length ? <div className="divide-y">{data.recent_orders.map((order) => <div key={order.order_id} className="grid gap-2 p-4 text-sm sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"><b>#{order.order_id}</b><span>{order.customer?.name ?? order.sale_account?.name ?? "—"} · {orderType(order.order_type)} · {formatOrderDate(order.created_at)}</span><OrderStatusBadge status={order.status} /><b>{formatMoney(order.total_amount)}</b></div>)}</div> : <p className="p-5 text-sm text-stone-500">لا توجد طلبات.</p>}
      </section>
    </>}
  </main>;
}
function Metric({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof TrendingUp }) {
  return <article className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><span className="text-sm font-bold text-stone-600">{label}</span><Icon className="h-5 w-5 text-gold-dark" /></div><b className="mt-3 block break-words text-2xl text-brand">{formatMoney(value)}</b><p className="mt-2 text-xs text-stone-500">{hint}</p></article>;
}
