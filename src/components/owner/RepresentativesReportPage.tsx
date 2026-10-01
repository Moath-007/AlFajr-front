import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, representativesService, type RepresentativesReportQuery, type RepresentativesReportResponseDto, type RepresentativeResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; rep: string; sort: 'completed_sales_document_amount' | 'completed_orders_count' | 'name' };
const blank: Draft = { from: '', to: '', rep: '', sort: 'completed_sales_document_amount' };

export default function RepresentativesReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<RepresentativesReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<RepresentativesReportResponseDto | null>(null);
  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    representativesService.list(undefined, controller.signal).then((r) => setReps(r.representatives)).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    reportsService.representatives(query, controller.signal).then((r) => { if (!controller.signal.aborted) setData(r); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المناديب.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية بعد النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      representative_id: draft.rep ? Number(draft.rep) : undefined, sort_by: draft.sort,
      sort_order: draft.sort === 'name' ? 'asc' : 'desc', page: 1, limit: 20 });
  };
  return <main className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">تقرير المناديب</h1>
      <p className="mt-2 text-sm text-stone-600">أداء مستندات طلبات الجملة الحالية. المكتملة بتاريخ إكمالها، المعلقة بتاريخ إنشائها، الملغاة بتاريخ إلغائها، والمردودات بتاريخ مستندها. لا ينسب التقرير تحصيلات العملاء إلى مندوب.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <label><span className="rep-label">المندوب</span><select className="rep-control" value={draft.rep} onChange={(e) => setDraft({ ...draft, rep: e.target.value })}><option value="">كل المناديب</option>{reps.map((r) => <option key={r.user_id} value={r.user_id}>{r.name}</option>)}</select></label>
      <label><span className="rep-label">الترتيب</span><select className="rep-control" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value as Draft['sort'] })}><option value="completed_sales_document_amount">قيمة الطلبات المكتملة</option><option value="completed_orders_count">عدد الطلبات المكتملة</option><option value="name">الاسم</option></select></label>
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setDraft(blank); setQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
    </form>
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {data && <><div className="flex justify-end"><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير المناديب', orientation: 'landscape' })}>طباعة الصفحة الحالية / PDF</button></div>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المناديب" subtitle={`صفحة ${data.pagination.page} · مستندات الجملة الحالية`} />
        <p className="text-xs text-stone-600">تعديل الطلب أو إلغاؤه أو حذفه قد يغير أرقام فترة سابقة. قيمة المردود مستقلة بتاريخ مستند المردود ولا تُطرح من قيمة طلبات فترة أخرى.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-stone-100">{['المندوب', 'مكتملة', 'معلقة', 'ملغاة', 'قيمة الطلبات المكتملة', 'قيمة المردودات المرتبطة'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.representatives.map((r) => <tr key={r.representative_id}><td className="border p-2">{r.name}</td><td className="border p-2">{r.completed_orders_count}</td><td className="border p-2">{r.pending_orders_count}</td><td className="border p-2">{r.cancelled_orders_count}</td><td className="border p-2">{formatMoney(r.completed_sales_document_amount)}</td><td className="border p-2">{formatMoney(r.returns_document_amount)}</td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.representatives.map((r) => <article key={r.representative_id} className="rounded-xl border p-3 text-sm"><b>{r.name}</b><p>مكتملة {r.completed_orders_count} · معلقة {r.pending_orders_count} · ملغاة {r.cancelled_orders_count}</p><p>طلبات مكتملة {formatMoney(r.completed_sales_document_amount)} · مردودات {formatMoney(r.returns_document_amount)}</p></article>)}</div>
        {!data.representatives.length && <p>لا توجد بيانات مطابقة.</p>}
      </section>{data.pagination.total_pages > 1 && <div className="flex justify-center gap-3"><button className="btn-outline" disabled={data.pagination.page <= 1} onClick={() => setQuery({ ...query, page: data.pagination.page - 1 })}>السابق</button><span>{data.pagination.page} / {data.pagination.total_pages}</span><button className="btn-outline" disabled={data.pagination.page >= data.pagination.total_pages} onClick={() => setQuery({ ...query, page: data.pagination.page + 1 })}>التالي</button></div>}</>}
  </main>;
}
