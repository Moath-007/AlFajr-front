import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { customersService, representativesService, reportsService,
  type CustomerSelectionDto, type RepresentativeResponseDto, type SalesReportQuery,
  type SalesReportResponseDto } from '@/api';
import { useGeneralSaleAccounts } from '@/components/orders/useGeneralSaleAccounts';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month';
  account: string; customer: string; representative: string };
const blank: Draft = { from: '', to: '', group: 'day', account: '', customer: '', representative: '' };
const kindName: Record<string, string> = { Sale: 'بيع', SaleReversal: 'عكس بيع', SalesReturn: 'مردود بيع', ReturnReversal: 'عكس مردود' };
const referenceText = (row: SalesReportResponseDto['activity']['items'][number]) => [
  row.order_id ? `طلب #${row.order_id}` : null,
  row.return_id ? `مردود #${row.return_id}` : null,
  `قيد #${row.journal_entry_id}`,
].filter(Boolean).join(' · ');
const localTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));

export default function SalesReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<SalesReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<SalesReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerSelectionDto[]>([]);
  const [representatives, setRepresentatives] = useState<RepresentativeResponseDto[]>([]);
  const [lookupError, setLookupError] = useState('');
  const accounts = useGeneralSaleAccounts();
  const printRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    representativesService.list(undefined, controller.signal)
      .then((result) => setRepresentatives(result.representatives))
      .catch((reason) => { if (!controller.signal.aborted) setLookupError(apiMessages(reason, 'تعذر تحميل المناديب.').join('، ')); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    customersService.list({ page: 1, limit: 30, search: customerSearch.trim() || undefined }, controller.signal)
      .then((result) => setCustomers(result.customers))
      .catch(() => { if (!controller.signal.aborted) setCustomers([]); });
    return () => controller.abort();
  }, [customerSearch]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.sales(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) { setData(null); setError(apiMessages(reason, 'تعذر تحميل تقرير المبيعات.').join('، ')); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      group_by: draft.group,
      sale_account_id: draft.account ? Number(draft.account) : undefined,
      customer_id: draft.customer ? Number(draft.customer) : undefined,
      created_by: draft.representative ? Number(draft.representative) : undefined,
      page: 1, limit: 20 });
  };
  const reset = () => { setDraft(blank); setCustomerSearch(''); setQuery({ page: 1, limit: 20 }); };
  const page = data?.activity.pagination;
  const selectedCustomer = customers.find((row) => String(row.customer_id) === draft.customer);
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';

  return <div className="mx-auto max-w-[1450px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المبيعات</h1>
      <p className="mt-2 text-sm text-stone-600">نشاط البيع والمردود المرحّل في دفتر اليومية حسب تاريخ الحركة. بيانات المنشئ والزبون معلومات وصفية.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <Select label="التجميع" value={draft.group} onChange={(group) => setDraft({ ...draft, group: group as Draft['group'] })} options={[["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"]]} />
      <Select label="حساب البيع" value={draft.account} onChange={(account) => setDraft({ ...draft, account })} options={[["", "كل الحسابات"], ...accounts.accounts.map((account) => [String(account.id), account.name])]} />
      <label className="block"><span className="rep-label">الزبون</span><input className="rep-control mb-1" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="بحث بالاسم أو الهاتف" />
        <select className="rep-control" value={draft.customer} onChange={(event) => setDraft({ ...draft, customer: event.target.value })}><option value="">كل الزبائن</option>{draft.customer && !selectedCustomer && <option value={draft.customer}>زبون #{draft.customer}</option>}{customers.map((customer) => <option key={customer.customer_id} value={customer.customer_id}>{customer.name} · #{customer.customer_id}</option>)}</select></label>
      <Select label="المندوب المنشئ" value={draft.representative} onChange={(representative) => setDraft({ ...draft, representative })} options={[["", "كل المناديب"], ...representatives.map((rep) => [String(rep.user_id), rep.name])]} />
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </form>
    {(accounts.error || lookupError) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{accounts.error || lookupError}</p>}
    {data?.filter_scope === 'known_metadata_only' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">تستخدم فلاتر الزبون والمنشئ بيانات المستند المتاح. حركات الفواتير المحذوفة تبقى في المجموع العام وبحسب حساب القيد، وتُستثنى من فلاتر البيانات الوصفية.</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <div className="flex justify-between gap-2 text-sm text-stone-600"><span>الفترة: {period} · Asia/Hebron</span><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير المبيعات', orientation: 'landscape' })}>طباعة / حفظ PDF</button></div>
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المبيعات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-3"><Metric label="إجمالي المبيعات" value={data.summary.gross_sales} /><Metric label="إجمالي المردودات" value={data.summary.returns} /><Metric label="صافي المبيعات" value={data.summary.net_sales} /></div>
        <section className="grid gap-4 lg:grid-cols-2"><Breakdown title="حسب حساب البيع" rows={data.by_sale_account.map((row) => ({ label: row.sale_account_name ?? 'بدون حساب بيع', ...row }))} /></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">النشاط حسب الفترة</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-stone-100">{['الفترة', 'مبيعات', 'مردودات', 'صافي'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.time_series.map((row) => <tr key={row.period}><td className="border p-2">{row.period}</td><td className="border p-2">{formatMoney(row.gross_sales)}</td><td className="border p-2">{formatMoney(row.returns)}</td><td className="border p-2 font-bold">{formatMoney(row.net_sales)}</td></tr>)}</tbody></table>{!data.time_series.length && <p className="p-4 text-stone-500">لا يوجد نشاط في الفترة.</p>}</div></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">حركات المبيعات</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / المرجع', 'حساب البيع', 'الزبون / المنشئ', 'الأثر الصافي'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <tr key={row.journal_entry_id}><td className="border p-2">{localTime(row.occurred_at)}</td><td className="border p-2"><b>{kindName[row.kind]}</b><small className="block text-stone-500">{referenceText(row)}</small></td><td className="border p-2">{row.sale_account_name ?? '—'}</td><td className="border p-2">{row.customer?.name ?? '—'}{row.creator && <small className="block">{row.creator.name}</small>}</td><td className="border p-2 font-bold">{formatMoney(row.net_effect)}</td></tr>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{kindName[row.kind]}</b><b>{formatMoney(row.net_effect)}</b></div><p>{localTime(row.occurred_at)} · {referenceText(row)}</p><p>{row.sale_account_name ?? 'بدون حساب بيع'} · {row.customer?.name ?? 'زبون غير متاح'}</p></div>)}</div>
          {!data.activity.items.length && <p className="p-4 text-stone-500">لا توجد حركات.</p>}
        </section>
      </article>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حركة</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="rep-label">{label}</span><select className="rep-control" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{formatMoney(value)}</b></div>;
}
function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; gross_sales: string; returns: string; net_sales: string }> }) {
  return <div className="rounded-xl border p-4"><h2 className="mb-3 font-black text-brand">{title}</h2><div className="space-y-2">{rows.map((row) => <div key={row.label} className="flex justify-between gap-2 border-b pb-2 text-sm"><span>{row.label}</span><span>مبيعات {formatMoney(row.gross_sales)} · مردود {formatMoney(row.returns)} · صافي <b>{formatMoney(row.net_sales)}</b></span></div>)}{!rows.length && <p className="text-stone-500">لا توجد بيانات.</p>}</div></div>;
}
