import SearchableSelect from '@/components/ui/Select';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, representativesService, type RepresentativesReportQuery, type RepresentativesReportResponseDto, type RepresentativeResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; rep: string; sort: 'completed_sales_document_amount' | 'completed_orders_count' | 'name' };
const blank: Draft = { from: '', to: '', rep: '', sort: 'completed_sales_document_amount' };

export default function RepresentativesReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const appliedDraft = useRef(JSON.stringify(blank));
  const [query, setQuery] = useState<RepresentativesReportQuery>({ page: 1, limit: 20, sort_by: 'completed_sales_document_amount', sort_order: 'desc' });
  const [loadedData, setData] = useState<RepresentativesReportResponseDto | null>(null);
  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const dateError = draft.from && draft.to && draft.from > draft.to ? 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' : '';
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<RepresentativesReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;
  useEffect(() => {
    const controller = new AbortController();
    representativesService.list(undefined, controller.signal).then((r) => { if (!controller.signal.aborted) setReps(r.representatives); }).catch((reason) => { if (!controller.signal.aborted) setLookupError(apiMessages(reason, 'تعذر تحميل قائمة المناديب.').join('، ')); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    reportsService.representatives(query, controller.signal).then((r) => { if (!controller.signal.aborted) setData(r); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المناديب.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  useEffect(() => {
    if (draft.from && draft.to && draft.from > draft.to) return;
    if (appliedDraft.current === JSON.stringify(draft)) return;
    const timer = window.setTimeout(() => {
      appliedDraft.current = JSON.stringify(draft);
      setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      representative_id: draft.rep ? Number(draft.rep) : undefined, sort_by: draft.sort,
      sort_order: draft.sort === 'name' ? 'asc' : 'desc', page: 1, limit: 20 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  return <main className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">تقرير المناديب</h1>
      <p className="mt-2 text-sm text-stone-600">عدد وقيمة الفواتير التي أنشأها كل مندوب. تُحسب المكتملة بتاريخ إكمالها، والمعلقة بتاريخ إنشائها، والملغاة بتاريخ إلغائها. القبض غير محسوب هنا.</p></header>
    <div className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <SearchableSelect label="المندوب" searchable searchPlaceholder="ابحث باسم المندوب أو الهاتف" value={draft.rep} onChange={(rep) => setDraft({ ...draft, rep })} options={[{ value: '', label: 'كل المناديب' }, ...reps.map((r) => ({ value: String(r.user_id), label: [r.name, r.phone].filter(Boolean).join(' · ') }))]} />
      <label><span className="rep-label">الترتيب</span><ReportOptions value={draft.sort} onChange={(value) => setDraft({ ...draft, sort: value as Draft['sort'] })}><option value="completed_sales_document_amount">قيمة الفواتير المكتملة</option><option value="completed_orders_count">عدد الفواتير المكتملة</option><option value="name">الاسم</option></ReportOptions></label>
      <div className="flex items-end gap-2"><button type="button" className="btn-outline min-h-11" onClick={() => { setDraft(blank); }}>إعادة ضبط</button></div>
    </div>
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {dateError && <p role="alert" className="rep-error">{dateError}</p>}
    {lookupError && <p role="alert" className="rep-error">{lookupError}</p>}
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {!loading && data && <><div className="flex justify-end"><button className="btn-outline" disabled={loading || fullPrint.printing || Boolean(dateError)} onClick={() => void fullPrint.print((page, signal) => reportsService.representatives({ ...query, page, limit: 100 }, signal), 'تقرير المناديب')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button></div>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المناديب" subtitle={`صفحة ${data.pagination.page} · الفواتير الحالية`} />
        <p className="text-xs text-stone-600">الأرقام حسب حالة الفواتير الحالية، وقد تتغير عند تعديل فاتورة أو إلغائها. المبالغ هنا قيمة بيع الفواتير المكتملة؛ الدفعات والمردودات ليست محسوبة ضمنها.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-stone-100">{['المندوب', 'عدد الفواتير المكتملة', 'عدد الفواتير المعلقة', 'عدد الفواتير الملغاة', 'قيمة الفواتير المكتملة'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.representatives.map((r) => <tr key={r.representative_id}><td className="border p-2">{r.name}</td><td className="border p-2">{r.completed_orders_count}</td><td className="border p-2">{r.pending_orders_count}</td><td className="border p-2">{r.cancelled_orders_count}</td><td className="border p-2"><ReportAmount value={r.completed_sales_document_amount} /></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.representatives.map((r) => <article key={r.representative_id} className="rounded-xl border p-3 text-sm"><b>{r.name}</b><p>مكتملة {r.completed_orders_count} · معلقة {r.pending_orders_count} · ملغاة {r.cancelled_orders_count}</p><p>قيمة الفواتير المكتملة <ReportAmount value={r.completed_sales_document_amount} /></p></article>)}</div>
        {!data.representatives.length && <p>لا توجد بيانات مطابقة.</p>}
      </section>{data.pagination.total_pages > 1 && <div className="flex justify-center gap-3"><button className="btn-outline" disabled={data.pagination.page <= 1} onClick={() => setQuery({ ...query, page: data.pagination.page - 1 })}>السابق</button><span>{data.pagination.page} / {data.pagination.total_pages}</span><button className="btn-outline" disabled={data.pagination.page >= data.pagination.total_pages} onClick={() => setQuery({ ...query, page: data.pagination.page + 1 })}>التالي</button></div>}</>}
  </main>;
}
