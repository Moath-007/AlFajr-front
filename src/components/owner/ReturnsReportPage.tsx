import SearchableSelect from '@/components/ui/Select';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, type ReturnsReportQuery,
  type ReturnsReportResponseDto } from '@/api';
import { useGeneralSaleAccounts } from '@/components/orders/useGeneralSaleAccounts';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month'; type: string; account: string; search: string };
const blank: Draft = { from: '', to: '', group: 'day', type: '', account: '', search: '' };
const typeName: Record<string, string> = { SalesReturn: 'مردود مبيعات', PurchaseReturn: 'مردود مشتريات' };
const localDate = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const reference = (row: ReturnsReportResponseDto['activity']['items'][number]) => [
  row.return_id ? `مردود #${row.return_id}` : null,
  row.order_id ? `فاتورة #${row.order_id}` : null,
  row.customer_purchase_id ? `شراء #${row.customer_purchase_id}` : null,
  `حركة #${row.journal_entry_id}`,
].filter(Boolean).join(' · ');

export default function ReturnsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const appliedDraft = useRef(JSON.stringify(blank));
  const [query, setQuery] = useState<ReturnsReportQuery>({ page: 1, limit: 20, group_by: 'day' });
  const [loadedData, setData] = useState<ReturnsReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const accounts = useGeneralSaleAccounts();
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<ReturnsReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.returns(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المردودات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  useEffect(() => {
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    if (appliedDraft.current === JSON.stringify(draft)) return;
    const timer = window.setTimeout(() => {
      appliedDraft.current = JSON.stringify(draft);
      setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined, group_by: draft.group,
      return_type: (draft.type || undefined) as ReturnsReportQuery['return_type'],
      sale_account_id: draft.account ? Number(draft.account) : undefined,
      search: draft.search.trim() || undefined, page: 1, limit: 20 }); }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const reset = () => { setDraft(blank); };
  const page = data?.activity.pagination;
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';
  return <div className="mx-auto max-w-[1450px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المردودات</h1>
      <p className="mt-2 text-sm text-stone-600">مردودات البيع والشراء والإلغاءات خلال الفترة. يظهر حساب كل حركة وكميتها ومبلغها، وحالة المردود الآن.</p></header>
    <div className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <Select label="عرض المجاميع" value={draft.group} onChange={(group) => setDraft({ ...draft, group: group as Draft['group'] })} options={[["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"]]} />
      <Select label="نوع المردود" value={draft.type} onChange={(type) => setDraft({ ...draft, type })} options={[["", "كل الأنواع"], ["SalesReturn", typeName.SalesReturn], ["PurchaseReturn", typeName.PurchaseReturn]]} />
      <SearchableSelect label="الحساب" searchable searchPlaceholder="ابحث بالاسم أو رقم الحساب أو الهاتف" loading={accounts.loading} value={draft.account} onChange={(account) => setDraft({ ...draft, account })} options={[{ value: '', label: 'كل الحسابات' }, ...accounts.accounts.map((account) => ({ value: String(account.id), label: [account.name, account.account_number, account.phone].filter(Boolean).join(' · ') }))]} />

      <label className="block"><span className="rep-label">رقم المرجع</span><input className="rep-control" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="رقم المردود أو الشراء" /></label>
      <div className="flex items-end gap-2"><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </div>
    {accounts.error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{accounts.error}</p>}
    {data?.filter_scope === 'known_metadata_only' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">بعض الفلاتر تحتاج بيانات المستند أو الطلب. تظل الحركة ذات البيانات المفقودة في التقرير غير المفلتر ضمن «غير متاح».</p>}
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <div className="flex justify-between gap-2 text-sm text-stone-600"><span>الفترة: {period} · القيم من القيود المالية</span><button className="btn-outline" disabled={loading || fullPrint.printing} onClick={() => void fullPrint.print((page, signal) => reportsService.returns({ ...query, page, limit: 100 }, signal), 'تقرير المردودات')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button></div>
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المردودات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-3"><Metric label="إجمالي المردودات" value={data.summary.gross_returns} /><Metric label="إلغاءات المردودات" value={data.summary.return_reversals} /><Metric label="صافي المردودات" value={data.summary.net_returns} /></div>
        <p className="text-xs text-stone-600">الصافي = المردودات الأصلية − إلغاءاتها. مردود المبيعات ومردود المشتريات يظهران منفصلين أدناه.</p>
        <section className="grid gap-4 lg:grid-cols-2"><Breakdown title="حسب النوع" rows={data.by_type.map((row) => ({ label: typeName[row.return_type], ...row }))} /></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">النشاط حسب الفترة</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-stone-100">{['الفترة', 'مردودات', 'إلغاءات', 'صافي'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.time_series.map((row) => <tr key={row.period}><td className="border p-2">{row.period}</td><td className="border p-2"><ReportAmount value={row.gross_returns} /></td><td className="border p-2"><ReportAmount value={row.return_reversals} /></td><td className="border p-2 font-bold"><ReportAmount value={row.net_returns} /></td></tr>)}</tbody></table>{!data.time_series.length && <p className="p-4 text-stone-500">لا يوجد نشاط في الفترة.</p>}</div></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">حركات المردودات</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / رقم المستند', 'نوع المردود', 'الحساب / المنفذ', 'الكمية الحالية / الحالة', 'المبلغ'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <tr key={row.journal_entry_id}><td className="border p-2">{localDate(row.occurred_at)}</td><td className="border p-2"><b>{row.kind === 'Return' ? 'مردود' : 'إلغاء أثر مردود'}</b><small className="block text-stone-500">{reference(row)}</small>{row.return_id && <Link data-print-ignore className="block text-brand underline" to={row.return_type === 'SalesReturn' ? `/owner/returns?return=${row.return_id}` : `/owner/account-sources/PurchaseReturn/${row.return_id}`}>عرض التفاصيل ↗</Link>}</td><td className="border p-2">{typeName[row.return_type]}</td><td className="border p-2">{row.sale_account_name ?? '—'}<small className="block text-stone-500">نفّذ الحركة: {row.actor?.name ?? 'غير متاح'}</small></td><td className="border p-2">{row.quantity ?? '—'} قطعة<small className="block">المستند حاليًا: {row.current_document_status === 'Cancelled' ? 'ملغى' : row.current_document_status === 'Active' ? 'فعال' : 'غير متاح'}</small></td><td className="border p-2 font-bold"><ReportAmount value={row.net_effect} /></td></tr>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.kind === 'Return' ? 'مردود' : 'إلغاء أثر مردود'} · {typeName[row.return_type]}</b><b><ReportAmount value={row.net_effect} /></b></div><p>{localDate(row.occurred_at)} · {reference(row)}</p><p>الحساب: {row.sale_account_name ?? 'غير متاح'}</p>{row.return_id && <Link className="text-brand underline" to={row.return_type === 'SalesReturn' ? `/owner/returns?return=${row.return_id}` : `/owner/account-sources/PurchaseReturn/${row.return_id}`}>عرض التفاصيل ↗</Link>}</div>)}</div>
          {!data.activity.items.length && <p className="p-4 text-stone-500">لا توجد حركات.</p>}
        </section>
      </article>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حركة</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="rep-label">{label}</span><ReportOptions value={value} onChange={(value) => onChange(value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</ReportOptions></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand"><ReportAmount value={value} /></b></div>;
}
function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; gross_returns: string; return_reversals: string; net_returns: string }> }) {
  return <div className="rounded-xl border p-4"><h2 className="mb-3 font-black text-brand">{title}</h2><div className="space-y-2">{rows.map((row) => <div key={row.label} className="border-b pb-2 text-sm"><span>{row.label}</span><span className="block text-stone-600">مردود <ReportAmount value={row.gross_returns} /> · إلغاء أثر <ReportAmount value={row.return_reversals} /> · صافي <b><ReportAmount value={row.net_returns} /></b></span></div>)}{!rows.length && <p className="text-stone-500">لا توجد بيانات.</p>}</div></div>;
}
