import { ReportQuantity } from '@/components/reports/ReportControls';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesService, reportsService, type CategoryResponseDto, type ProductsReportQuery, type ProductsReportResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; search: string; category: string; rank: 'quantity' | 'sales_line_amount' };
const blank: Draft = { from: '', to: '', search: '', category: '', rank: 'quantity' };
const numeric = (n: number) => new Intl.NumberFormat('en-US').format(n);

export default function ProductsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const appliedDraft = useRef(JSON.stringify(blank));
  const [query, setQuery] = useState<ProductsReportQuery>({ page: 1, limit: 20, rank_by: 'quantity' });
  const [loadedData, setData] = useState<ProductsReportResponseDto | null>(null);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const dateError = draft.from && draft.to && draft.from > draft.to ? 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' : '';
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<ProductsReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;
  useEffect(() => {
    const controller = new AbortController();
    categoriesService.list(controller.signal).then((rows) => { if (!controller.signal.aborted) setCategories(rows); }).catch((reason) => { if (!controller.signal.aborted) setLookupError(apiMessages(reason, 'تعذر تحميل التصنيفات.').join('، ')); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    reportsService.products(query, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المنتجات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  useEffect(() => {
    if (draft.from && draft.to && draft.from > draft.to) return;
    if (appliedDraft.current === JSON.stringify(draft)) return;
    const timer = window.setTimeout(() => {
      appliedDraft.current = JSON.stringify(draft);
      setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      search: draft.search.trim() || undefined, category_id: draft.category ? Number(draft.category) : undefined,
      rank_by: draft.rank, page: 1, limit: 20 });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  return <main className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">تقرير المنتجات</h1>
      <p className="mt-2 text-sm text-stone-600">تحليل بنود الفواتير المكتملة والمردودات الفعالة في الفترة. يعكس المستندات الحالية؛ تعديل الطلب أو إلغاؤه أو حذفه يغيّر النتائج السابقة.</p></header>
    <div className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <label><span className="rep-label">بحث عن منتج</span><input className="rep-control" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="الاسم أو الكود" /></label>
      <label><span className="rep-label">التصنيف</span><ReportOptions value={draft.category} onChange={(value) => setDraft({ ...draft, category: value })}><option value="">كل التصنيفات</option>{categories.map((row) => <option key={row.category_id} value={row.category_id}>{row.name}</option>)}</ReportOptions></label>
      <label><span className="rep-label">الترتيب</span><ReportOptions value={draft.rank} onChange={(value) => setDraft({ ...draft, rank: value as Draft['rank'] })}><option value="quantity">الكمية المباعة</option><option value="sales_line_amount">قيمة المنتجات المباعة</option></ReportOptions></label>
      <div className="flex items-end gap-2"><button type="button" className="btn-outline min-h-11" onClick={() => { setDraft(blank); }}>إعادة ضبط</button></div>
    </div>
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {dateError && <p role="alert" className="rep-error">{dateError}</p>}
    {lookupError && <p role="alert" className="rep-error">{lookupError}</p>}
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {!loading && data && <><div className="flex justify-end"><button className="btn-outline" disabled={loading || fullPrint.printing || Boolean(dateError)} onClick={() => void fullPrint.print((page, signal) => reportsService.products({ ...query, page, limit: 100 }, signal), 'تقرير المنتجات')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button></div>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المنتجات" subtitle={`صفحة ${data.pagination.page} · حسب المستندات الحالية`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['المنتجات', numeric(data.summary.products_count)], ['المباعة', numeric(data.summary.sold_quantity)], ['المرتجعة', numeric(data.summary.returned_quantity)], ['الكمية بعد المردودات', numeric(data.summary.net_quantity)]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><span className="text-xs">{label}</span><b className="block text-xl text-brand">{label === 'الكمية بعد المردودات' ? <ReportQuantity value={data.summary.net_quantity} /> : value}</b></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3"><span className="text-sm text-stone-600">قيمة المنتجات التي بعناها</span><b className="mt-1 block text-xl text-brand"><ReportAmount value={data.summary.sales_line_amount} /></b><p className="mt-1 text-xs text-stone-600">خصم كل منتج محسوب هنا، لكن الخصم على الفاتورة كاملة غير محسوب.</p></div>
          <div className="rounded-xl border p-3"><span className="text-sm text-stone-600">قيمة المنتجات التي رجعت لنا</span><b className="mt-1 block text-xl text-brand"><ReportAmount value={data.summary.return_document_amount} /></b><p className="mt-1 text-xs text-stone-600">حسب الأسعار المسجلة في المردودات.</p></div>
        </div>
        <p className="text-xs text-stone-600">هذه أرقام البيع والمردودات. لمعرفة الربح نحتاج تكلفة البضاعة أيضًا.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['المنتج', 'الكود', 'مباع', 'مرتجع', 'صافي الكمية', 'قيمة المنتجات المباعة قبل خصم الفاتورة', 'قيمة المنتجات المرتجعة'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.products.map((r) => <tr key={r.product_id}><td className="border p-2">{r.name}</td><td className="border p-2">{r.code}</td><td className="border p-2">{numeric(r.sold_quantity)}</td><td className="border p-2">{numeric(r.returned_quantity)}</td><td className="border p-2"><ReportQuantity value={r.net_quantity} /></td><td className="border p-2"><ReportAmount value={r.sales_line_amount} /></td><td className="border p-2"><ReportAmount value={r.return_document_amount} /></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.products.map((r) => <article key={r.product_id} className="rounded-xl border p-3 text-sm"><b>{r.name} · {r.code}</b><p>مباع {numeric(r.sold_quantity)} · مرتجع {numeric(r.returned_quantity)} · صافي <ReportQuantity value={r.net_quantity} /></p><p>قيمة البيع قبل خصم الفاتورة <ReportAmount value={r.sales_line_amount} /> · قيمة المنتجات المرتجعة <ReportAmount value={r.return_document_amount} /></p></article>)}</div>
        {!data.products.length && <p>لا توجد بيانات مطابقة.</p>}
      </section><Pager page={data.pagination.page} pages={data.pagination.total_pages} onPage={(page) => setQuery({ ...query, page })} /></>}
  </main>;
}
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return pages <= 1 ? null : <div className="flex justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button><span>{page} / {pages}</span><button className="btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</button></div>;
}
