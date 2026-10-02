import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, type ReturnsReportQuery,
  type ReturnsReportResponseDto } from '@/api';
import { useGeneralSaleAccounts } from '@/components/orders/useGeneralSaleAccounts';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month'; type: string; source: string; account: string; search: string };
const blank: Draft = { from: '', to: '', group: 'day', type: '', source: '', account: '', search: '' };
const typeName: Record<string, string> = { SalesReturn: 'مردود مبيعات', PurchaseReturn: 'مردود مشتريات الزبائن' };
const sourceName: Record<string, string> = { Online: 'أونلاين', Direct: 'مباشر / محل', Representative: 'مندوب / جملة',
  CustomerPurchase: 'مرتبط بعملية شراء', Unknown: 'غير متاح' };
const localTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
const reference = (row: ReturnsReportResponseDto['activity']['items'][number]) => [
  row.return_id ? `مردود #${row.return_id}` : null,
  row.order_id ? `طلب #${row.order_id}` : null,
  row.customer_purchase_id ? `شراء #${row.customer_purchase_id}` : null,
  `قيد #${row.journal_entry_id}`,
].filter(Boolean).join(' · ');

export default function ReturnsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<ReturnsReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<ReturnsReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accounts = useGeneralSaleAccounts();
  const printRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.returns(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المردودات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined, group_by: draft.group,
      return_type: (draft.type || undefined) as ReturnsReportQuery['return_type'],
      source: (draft.source || undefined) as ReturnsReportQuery['source'],
      sale_account_id: draft.account ? Number(draft.account) : undefined,
      search: draft.search.trim() || undefined, page: 1, limit: 20 });
  };
  const reset = () => { setDraft(blank); setQuery({ page: 1, limit: 20 }); };
  const page = data?.activity.pagination;
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';
  return <div className="mx-auto max-w-[1450px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المردودات</h1>
      <p className="mt-2 text-sm text-stone-600">نشاط المردودات وعكوسها من دفتر اليومية حسب تاريخ القيد. حالة المستند الحالية معلومة إضافية ولا تغيّر التاريخ.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <Select label="التجميع" value={draft.group} onChange={(group) => setDraft({ ...draft, group: group as Draft['group'] })} options={[["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"]]} />
      <Select label="نوع المردود" value={draft.type} onChange={(type) => setDraft({ ...draft, type })} options={[["", "كل الأنواع"], ["SalesReturn", typeName.SalesReturn], ["PurchaseReturn", typeName.PurchaseReturn]]} />
      <Select label="المصدر" value={draft.source} onChange={(source) => setDraft({ ...draft, source })} options={[["", "كل المصادر"], ...Object.entries(sourceName)]} />
      <Select label="حساب البيع General" value={draft.account} onChange={(account) => setDraft({ ...draft, account })} options={[["", "كل الحسابات"], ...accounts.accounts.map((account) => [String(account.id), account.name])]} />

      <label className="block"><span className="rep-label">رقم المرجع</span><input className="rep-control" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="رقم المردود أو الطلب أو الشراء" /></label>
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </form>
    {accounts.error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{accounts.error}</p>}
    {data?.filter_scope === 'known_metadata_only' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">بعض الفلاتر تحتاج بيانات المستند أو الطلب. تظل الحركة ذات البيانات المفقودة في التقرير غير المفلتر ضمن «غير متاح».</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <div className="flex justify-between gap-2 text-sm text-stone-600"><span>الفترة: {period} · Asia/Hebron · القيم من القيود المالية</span><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير المردودات', orientation: 'landscape' })}>طباعة / حفظ PDF</button></div>
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المردودات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-3"><Metric label="إجمالي المردودات" value={data.summary.gross_returns} /><Metric label="عكوس المردودات" value={data.summary.return_reversals} /><Metric label="صافي المردودات" value={data.summary.net_returns} /></div>
        <p className="text-xs text-stone-600">الصافي = المردودات الأصلية − عكوسها. مردود المبيعات ومردود مشتريات الزبائن يظهران منفصلين أدناه.</p>
        <section className="grid gap-4 lg:grid-cols-2"><Breakdown title="حسب النوع" rows={data.by_type.map((row) => ({ label: typeName[row.return_type], ...row }))} /><Breakdown title="حسب المصدر" rows={data.by_source.map((row) => ({ label: sourceName[row.source], ...row }))} /></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">النشاط حسب الفترة</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-stone-100">{['الفترة', 'مردودات', 'عكوس', 'صافي'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.time_series.map((row) => <tr key={row.period}><td className="border p-2">{row.period}</td><td className="border p-2">{formatMoney(row.gross_returns)}</td><td className="border p-2">{formatMoney(row.return_reversals)}</td><td className="border p-2 font-bold">{formatMoney(row.net_returns)}</td></tr>)}</tbody></table>{!data.time_series.length && <p className="p-4 text-stone-500">لا يوجد نشاط في الفترة.</p>}</div></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">حركات المردودات</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / المرجع', 'النوع / المصدر', 'الحساب / المنفذ', 'الحساب', 'الكمية / الحالة الحالية', 'الأثر المالي'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <tr key={row.journal_entry_id}><td className="border p-2">{localTime(row.occurred_at)}</td><td className="border p-2"><b>{row.kind === 'Return' ? 'مردود' : 'عكس مردود'}</b><small className="block text-stone-500">{reference(row)}</small></td><td className="border p-2">{typeName[row.return_type]}<small className="block">{sourceName[row.source]}</small></td><td className="border p-2">{row.sale_account_name ?? '—'}<small className="block text-stone-500">نفّذ الحركة: {row.actor?.name ?? 'غير متاح'}</small></td><td className="border p-2">{row.sale_account_name ?? '—'}</td><td className="border p-2">{row.quantity ?? '—'} قطعة<small className="block">المستند حاليًا: {row.current_document_status === 'Cancelled' ? 'ملغى' : row.current_document_status === 'Active' ? 'فعال' : 'غير متاح'}</small></td><td className="border p-2 font-bold">{formatMoney(row.net_effect)}</td></tr>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.kind === 'Return' ? 'مردود' : 'عكس مردود'} · {typeName[row.return_type]}</b><b>{formatMoney(row.net_effect)}</b></div><p>{localTime(row.occurred_at)} · {reference(row)}</p><p>{sourceName[row.source]} · الحساب: {row.sale_account_name ?? 'غير متاح'}</p></div>)}</div>
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
function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; gross_returns: string; return_reversals: string; net_returns: string }> }) {
  return <div className="rounded-xl border p-4"><h2 className="mb-3 font-black text-brand">{title}</h2><div className="space-y-2">{rows.map((row) => <div key={row.label} className="border-b pb-2 text-sm"><span>{row.label}</span><span className="block text-stone-600">مردود {formatMoney(row.gross_returns)} · عكس {formatMoney(row.return_reversals)} · صافي <b>{formatMoney(row.net_returns)}</b></span></div>)}{!rows.length && <p className="text-stone-500">لا توجد بيانات.</p>}</div></div>;
}
