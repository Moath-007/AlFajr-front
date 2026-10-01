import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { categoriesService, reportsService, type CategoryResponseDto, type ProductsReportQuery, type ProductsReportResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; search: string; category: string; rank: 'quantity' | 'sales_line_amount' };
const blank: Draft = { from: '', to: '', search: '', category: '', rank: 'quantity' };
const numeric = (n: number) => new Intl.NumberFormat('en-US').format(n);

export default function ProductsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<ProductsReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<ProductsReportResponseDto | null>(null);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    categoriesService.list(controller.signal).then(setCategories).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    reportsService.products(query, controller.signal).then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المنتجات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية بعد النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined,
      search: draft.search.trim() || undefined, category_id: draft.category ? Number(draft.category) : undefined,
      rank_by: draft.rank, page: 1, limit: 20 });
  };
  return <main className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header><h1 className="text-3xl font-black text-brand">تقرير المنتجات</h1>
      <p className="mt-2 text-sm text-stone-600">تحليل بنود الطلبات المكتملة والمردودات الفعالة في الفترة. يعكس المستندات الحالية؛ تعديل الطلب أو إلغاؤه أو حذفه يغيّر النتائج السابقة.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <label><span className="rep-label">بحث عن منتج</span><input className="rep-control" value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} placeholder="الاسم أو الكود" /></label>
      <label><span className="rep-label">التصنيف</span><select className="rep-control" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option value="">كل التصنيفات</option>{categories.map((row) => <option key={row.category_id} value={row.category_id}>{row.name}</option>)}</select></label>
      <label><span className="rep-label">الترتيب</span><select className="rep-control" value={draft.rank} onChange={(e) => setDraft({ ...draft, rank: e.target.value as Draft['rank'] })}><option value="quantity">الكمية المباعة</option><option value="sales_line_amount">قيمة بنود البيع</option></select></label>
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setDraft(blank); setQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
    </form>
    {error && <p role="alert" className="rep-error">{error}</p>}{loading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل التقرير…</p>}
    {data && <><div className="flex justify-end"><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير المنتجات', orientation: 'landscape' })}>طباعة الصفحة الحالية / PDF</button></div>
      <section ref={printRef} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المنتجات" subtitle={`صفحة ${data.pagination.page} · حسب المستندات الحالية`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['المنتجات', numeric(data.summary.products_count)], ['المباعة', numeric(data.summary.sold_quantity)], ['المرتجعة', numeric(data.summary.returned_quantity)], ['الصافي الكمي', numeric(data.summary.net_quantity)]].map(([label, value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><span className="text-xs">{label}</span><b className="block text-xl text-brand">{value}</b></div>)}</div>
        <p className="text-sm">قيمة بنود البيع بعد خصم البند وقبل خصم الطلب: <b>{formatMoney(data.summary.sales_line_amount)}</b> · قيمة مستندات المردود: <b>{formatMoney(data.summary.return_document_amount)}</b></p>
        <p className="text-xs text-stone-600">قيمة المردود قد تشمل خصم مستوى الطلب؛ لذلك لا نطرح القيمتين لتسمية «صافي إيراد»، ولا نوزع خصم الطلب على المنتجات.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['المنتج', 'الكود', 'مباع', 'مرتجع', 'صافي الكمية', 'بنود البيع قبل خصم الطلب', 'قيمة مستند المردود'].map((h) => <th key={h} className="border p-2 text-right">{h}</th>)}</tr></thead><tbody>{data.products.map((r) => <tr key={r.product_id}><td className="border p-2">{r.name}</td><td className="border p-2">{r.code}</td><td className="border p-2">{numeric(r.sold_quantity)}</td><td className="border p-2">{numeric(r.returned_quantity)}</td><td className="border p-2">{numeric(r.net_quantity)}</td><td className="border p-2">{formatMoney(r.sales_line_amount)}</td><td className="border p-2">{formatMoney(r.return_document_amount)}</td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.products.map((r) => <article key={r.product_id} className="rounded-xl border p-3 text-sm"><b>{r.name} · {r.code}</b><p>مباع {numeric(r.sold_quantity)} · مرتجع {numeric(r.returned_quantity)} · صافي {numeric(r.net_quantity)}</p><p>بنود البيع {formatMoney(r.sales_line_amount)} · المردود {formatMoney(r.return_document_amount)}</p></article>)}</div>
        {!data.products.length && <p>لا توجد بيانات مطابقة.</p>}
      </section><Pager page={data.pagination.page} pages={data.pagination.total_pages} onPage={(page) => setQuery({ ...query, page })} /></>}
  </main>;
}
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  return pages <= 1 ? null : <div className="flex justify-center gap-3"><button className="btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button><span>{page} / {pages}</span><button className="btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>التالي</button></div>;
}
