import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { customersService, reportsService, type CustomerSelectionDto, type WriteOffsReportQuery, type WriteOffsReportResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; customer: string; actor: string };
const blank: Draft = { from: '', to: '', customer: '', actor: '' };
const businessDateTime = (value: string) => new Intl.DateTimeFormat('ar', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(value));

export default function WriteOffsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<WriteOffsReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<WriteOffsReportResponseDto | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerSelectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    customersService.list({ page: 1, limit: 30, search: customerSearch.trim() || undefined }, controller.signal)
      .then((r) => { if (!controller.signal.aborted) setCustomers(r.customers); }).catch(() => undefined);
    return () => controller.abort();
  }, [customerSearch]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    reportsService.writeOffs(query, controller.signal).then((r) => { if (!controller.signal.aborted) setData(r); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المسامحات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية بعد النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      customer_id: draft.customer ? Number(draft.customer) : undefined,
      actor_id: draft.actor ? Number(draft.actor) : undefined, page: 1, limit: 20 });
  };
  return <main className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">تقرير المسامحات</h1>
      <p className="mt-2 text-sm text-stone-600">نشاط قيود المسامحات وعكوسها. خصومات المبيعات ليست ضمن هذا التقرير؛ تبقى الحركة الأصلية ظاهرة بعد إلغائها.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ النشاط" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ النشاط" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <label><span className="rep-label">العميل</span><input className="rep-control mb-1" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف" /><select className="rep-control" value={draft.customer} onChange={(e) => setDraft({ ...draft, customer: e.target.value })}><option value="">كل العملاء</option>{draft.customer && !customers.some((r) => String(r.customer_id) === draft.customer) && <option value={draft.customer}>عميل #{draft.customer}</option>}{customers.map((r) => <option key={r.customer_id} value={r.customer_id}>{r.name}</option>)}</select></label>
      <label><span className="rep-label">معرّف المنفذ</span><input type="number" min="1" className="rep-control" value={draft.actor} onChange={(e) => setDraft({ ...draft, actor: e.target.value })} /></label>
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setDraft(blank); setCustomerSearch(''); setQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
    </form>
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {data && <><div className="flex justify-end"><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير المسامحات', orientation: 'landscape' })}>طباعة الصفحة الحالية / PDF</button></div>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المسامحات" subtitle={`صفحة ${data.activity.pagination.page} · تاريخ القيد المالي`} />
        <div className="grid gap-3 sm:grid-cols-3">{[['إجمالي المسامحات', data.summary.gross_write_offs], ['العكوس', data.summary.reversals], ['الصافي', data.summary.net_write_offs]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><span className="text-xs">{label}</span><b className="block text-xl text-brand">{formatMoney(value)}</b></div>)}</div>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['تاريخ القيد', 'الحركة', 'العميل', 'المسامحة / القيد', 'المنفذ', 'المبلغ', 'الأثر', 'ملاحظة'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.activity.items.map((r) => <tr key={r.journal_entry_id}><td className="border p-2">{businessDateTime(r.occurred_at)}</td><td className="border p-2">{r.kind === 'WriteOff' ? 'مسامحة' : 'عكس مسامحة'}</td><td className="border p-2">{r.customer.name}</td><td className="border p-2">#{r.write_off_id} · قيد #{r.journal_entry_id}{r.original_journal_entry_id && <small className="block">يعكس قيد #{r.original_journal_entry_id}</small>}</td><td className="border p-2">{r.actor?.name ?? 'غير متاح'}</td><td className="border p-2">{formatMoney(r.amount)}</td><td className="border p-2">{formatMoney(r.effect)}</td><td className="border p-2">{r.notes ?? '—'}</td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((r) => <article key={r.journal_entry_id} className="rounded-xl border p-3 text-sm"><b>{r.kind === 'WriteOff' ? 'مسامحة' : 'عكس مسامحة'} · {formatMoney(r.effect)}</b><p>{businessDateTime(r.occurred_at)} · {r.customer.name}</p><p>مسامحة #{r.write_off_id} · قيد #{r.journal_entry_id}{r.original_journal_entry_id ? ` · يعكس #${r.original_journal_entry_id}` : ''}</p><p>المنفذ: {r.actor?.name ?? 'غير متاح'} · {r.notes ?? '—'}</p></article>)}</div>
        {!data.activity.items.length && <p>لا توجد حركات مطابقة.</p>}
      </section>{data.activity.pagination.total_pages > 1 && <div className="flex justify-center gap-3"><button className="btn-outline" disabled={data.activity.pagination.page <= 1} onClick={() => setQuery({ ...query, page: data.activity.pagination.page - 1 })}>السابق</button><span>{data.activity.pagination.page} / {data.activity.pagination.total_pages}</span><button className="btn-outline" disabled={data.activity.pagination.page >= data.activity.pagination.total_pages} onClick={() => setQuery({ ...query, page: data.activity.pagination.page + 1 })}>التالي</button></div>}</>}
  </main>;
}
