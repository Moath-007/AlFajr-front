import { currentMonth } from '@/components/finance/accountUiUtils';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { SlidersHorizontal } from 'lucide-react';
import '@/components/reports/ReportsLayout.css';
import { ReportQuantity } from '@/components/reports/ReportControls';
import { ReportAmount } from '@/components/reports/ReportControls';
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
  const [draft, setDraft] = useState<Draft>(() => ({...blank, ...currentMonth()}));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extra, setExtra] = useState<Draft>(blank);
  const [query, setQuery] = useState<ProductsReportQuery>(() => ({ page: 1, limit: 20, rank_by: 'quantity', date_from: currentMonth().from, date_to: currentMonth().to }));
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
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل أداء المنتجات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const apply = (filters = {...blank, search:query.search ?? '', category:query.category_id ? String(query.category_id) : '', rank:query.rank_by ?? 'quantity'}) => {
    if (dateError) return;
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      search: filters.search.trim() || undefined, category_id: filters.category ? Number(filters.category) : undefined,
      rank_by: filters.rank, page: 1, limit: 20 });
    setFiltersOpen(false);
  };
  const reset = () => { const initial = {...blank, ...currentMonth()}; setDraft(initial); setExtra(blank); setQuery({page:1,limit:20,rank_by:'quantity',date_from:initial.from,date_to:initial.to}); };
  return <main className="report-page mx-auto max-w-[1350px] space-y-4 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">أداء المنتجات</h1>
      <details className="report-note mt-2"><summary>كيف تقرأ التقرير؟</summary><p className="mt-2 text-sm text-stone-600">تحليل بنود الفواتير المكتملة والمردودات الفعالة في الفترة. يعكس المستندات الحالية؛ تعديل الطلب أو إلغاؤه أو حذفه يغيّر النتائج السابقة.</p></details></header>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
      <div className="w-[200px]"><RepDateInput label="من تاريخ" value={draft.from} onChange={from => setDraft({...draft,from})} max={draft.to || undefined}/></div>
      <div className="w-[200px]"><RepDateInput label="إلى تاريخ" value={draft.to} onChange={to => setDraft({...draft,to})} min={draft.from || undefined}/></div>
      <button className="btn-primary" disabled={Boolean(dateError)} onClick={() => apply()}>تطبيق</button>
      <button className="btn-outline" onClick={reset}>إعادة ضبط</button>
      <button className="btn-outline inline-flex items-center gap-2" onClick={() => {setExtra({...blank,search:query.search ?? '',category:query.category_id ? String(query.category_id) : '',rank:query.rank_by ?? 'quantity'});setFiltersOpen(true);}}><SlidersHorizontal size={18}/>فلاتر إضافية</button>
      <button className="btn-outline" disabled={!data || loading || fullPrint.printing} onClick={() => void fullPrint.print((page, signal) => reportsService.products({ ...query, page, limit: 100 }, signal), 'أداء المنتجات')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>
    </div>
    <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="فلاتر أداء المنتجات" className="filters-drawer" footer={<div className="grid grid-cols-2 gap-3"><button className="btn-primary" disabled={Boolean(dateError)} onClick={() => apply(extra)}>تطبيق الفلاتر</button><button className="btn-outline" onClick={() => setExtra(blank)}>مسح الكل</button></div>}>
      <div className="space-y-5" dir="rtl">
        <label className="block"><span className="rep-label">بحث عن منتج</span><input className="rep-control" value={extra.search} onChange={e => setExtra({...extra,search:e.target.value})} placeholder="الاسم أو الكود"/></label>
        <Select label="التصنيف" value={extra.category} onChange={category => setExtra({...extra,category})} options={[{value:'',label:'كل التصنيفات'},...categories.map(row => ({value:String(row.category_id),label:row.name}))]}/>
        <Select label="الترتيب" value={extra.rank} onChange={rank => setExtra({...extra,rank:rank as Draft['rank']})} options={[{value:'quantity',label:'الأكثر بيعًا بالكمية'},{value:'sales_line_amount',label:'الأعلى بقيمة البيع'}]}/>
      </div>
    </Modal>
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {dateError && <p role="alert" className="rep-error">{dateError}</p>}
    {lookupError && <p role="alert" className="rep-error">{lookupError}</p>}
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="أداء المنتجات" subtitle={`الفترة: ${query.date_from ?? 'كل التواريخ'} — ${query.date_to ?? 'حتى الآن'}`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['المنتجات', numeric(data.summary.products_count)], ['الكمية المباعة', numeric(data.summary.sold_quantity)], ['الكمية المرتجعة', numeric(data.summary.returned_quantity)], ['صافي الكمية المباعة', numeric(data.summary.net_quantity)]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><span className="text-xs">{label}</span><b className="block text-xl text-brand">{label === 'صافي الكمية المباعة' ? <ReportQuantity value={data.summary.net_quantity} /> : value}</b></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3"><span className="text-sm text-stone-600">قيمة البيع قبل خصم الفاتورة</span><b className="mt-1 block text-xl text-brand"><ReportAmount value={data.summary.sales_line_amount} /></b><p className="mt-1 text-xs text-stone-600">خصم كل منتج محسوب هنا، لكن الخصم على الفاتورة كاملة غير محسوب.</p></div>
          <div className="rounded-xl border p-3"><span className="text-sm text-stone-600">قيمة المردودات</span><b className="mt-1 block text-xl text-brand"><ReportAmount value={data.summary.return_document_amount} /></b><p className="mt-1 text-xs text-stone-600">حسب الأسعار المسجلة في المردودات.</p></div>
        </div>
        <h2 className="text-xl font-black text-brand">تفاصيل المنتجات</h2>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['المنتج', 'الكود', 'مباع', 'مرتجع', 'صافي الكمية المباعة', 'قيمة المنتجات المباعة قبل خصم الفاتورة', 'قيمة المنتجات المرتجعة'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.products.map((r) => <tr key={r.product_id}><td className="border p-2">{r.name}</td><td className="border p-2">{r.code}</td><td className="border p-2">{numeric(r.sold_quantity)}</td><td className="border p-2">{numeric(r.returned_quantity)}</td><td className="border p-2"><ReportQuantity value={r.net_quantity} /></td><td className="border p-2"><ReportAmount value={r.sales_line_amount} /></td><td className="border p-2"><ReportAmount value={r.return_document_amount} /></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.products.map((r) => <article key={r.product_id} className="rounded-xl border p-3 text-sm"><b>{r.name} · {r.code}</b><p>مباع {numeric(r.sold_quantity)} · مرتجع {numeric(r.returned_quantity)} · صافي <ReportQuantity value={r.net_quantity} /></p><p>قيمة البيع قبل خصم الفاتورة <ReportAmount value={r.sales_line_amount} /> · قيمة المنتجات المرتجعة <ReportAmount value={r.return_document_amount} /></p></article>)}</div>
        {!data.products.length && <p>لا توجد بيانات مطابقة.</p>}
      </section><Pager page={data.pagination.page} pages={data.pagination.total_pages} onPage={(page) => setQuery({ ...query, page })} /></>}
  </main>;
}
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return pages <= 1 ? null : <div className="flex justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button><span>{page} / {pages}</span><button className="btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</button></div>;
}
