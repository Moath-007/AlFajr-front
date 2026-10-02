import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { categoriesService, colorsService, reportsService,
  type CategoryResponseDto, type ColorResponseDto, type InventoryReportQuery,
  type InventoryReportResponseDto, type InventoryReportMovementsQuery,
  type InventoryReportMovementsResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type StockDraft = { search: string; category: string; product: string; color: string; status: string };
type MovementDraft = { from: string; to: string; product: string; variant: string;
  type: string; actor: string; search: string };
const blankStock: StockDraft = { search: '', category: '', product: '', color: '', status: '' };
const blankMovement: MovementDraft = { from: '', to: '', product: '', variant: '', type: '', actor: '', search: '' };
const statusLabels = { available: 'متوفر', low: 'منخفض', out: 'نافد', negative: 'سالب' };
const movementLabels: Record<string, string> = {
  OpeningBalance: 'رصيد افتتاحي', OpeningStock: 'رصيد افتتاحي', Sale: 'بيع',
  OrderEdit: 'تعديل طلب', OrderCancelled: 'إلغاء طلب', OrderDeleted: 'حذف طلب',
  SalesReturn: 'مردود مبيعات', PurchaseReturn: 'مردود مشتريات زبون',
  ReturnCancelled: 'إلغاء مردود', CustomerPurchase: 'شراء من زبون',
  CustomerPurchaseEdit: 'تعديل شراء من زبون', CustomerPurchaseCancelled: 'إلغاء شراء من زبون',
  OpeningStockCorrected: 'تصحيح مخزون افتتاحي',
  OpeningStockCancelled: 'إلغاء مخزون افتتاحي',
};
const number = (value: number) => new Intl.NumberFormat('en-US').format(value);
const snapshotTime = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
const id = (value: string) => value ? Number(value) : undefined;
const movementRef = (row: InventoryReportMovementsResponseDto['items'][number]) => [
  row.order_id ? `طلب #${row.order_id}` : null,
  row.customer_purchase_id ? `شراء #${row.customer_purchase_id}` : null,
  row.customer_return_id ? `مردود #${row.customer_return_id}` : null,
  `حركة #${row.inventory_movement_id}`,
].filter(Boolean).join(' · ');

export default function InventoryReportPage() {
  const [stockDraft, setStockDraft] = useState<StockDraft>(blankStock);
  const [movementDraft, setMovementDraft] = useState<MovementDraft>(blankMovement);
  const [stockQuery, setStockQuery] = useState<InventoryReportQuery>({ page: 1, limit: 20 });
  const [movementQuery, setMovementQuery] = useState<InventoryReportMovementsQuery>({ page: 1, limit: 20 });
  const [stock, setStock] = useState<InventoryReportResponseDto | null>(null);
  const [movements, setMovements] = useState<InventoryReportMovementsResponseDto | null>(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [movementLoading, setMovementLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [movementError, setMovementError] = useState('');
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const stockPrint = useRef<HTMLElement>(null);
  const movementPrint = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    categoriesService.list(controller.signal).then(setCategories).catch(() => undefined);
    colorsService.list(controller.signal).then(setColors).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setStockLoading(true); setStockError('');
    reportsService.inventory(stockQuery, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setStock(result); })
      .catch((error) => { if (!controller.signal.aborted) setStockError(apiMessages(error, 'تعذر تحميل المخزون الحالي.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setStockLoading(false); });
    return () => controller.abort();
  }, [stockQuery]);
  useEffect(() => {
    const controller = new AbortController();
    setMovementLoading(true); setMovementError('');
    reportsService.inventoryMovements(movementQuery, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setMovements(result); })
      .catch((error) => { if (!controller.signal.aborted) setMovementError(apiMessages(error, 'تعذر تحميل حركات المخزون.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setMovementLoading(false); });
    return () => controller.abort();
  }, [movementQuery]);
  const applyStock = (event: FormEvent) => {
    event.preventDefault();
    setStockQuery({ search: stockDraft.search.trim() || undefined, category_id: id(stockDraft.category),
      product_id: id(stockDraft.product), color_id: id(stockDraft.color),
      stock_status: (stockDraft.status || undefined) as InventoryReportQuery['stock_status'], page: 1, limit: 20 });
  };
  const applyMovement = (event: FormEvent) => {
    event.preventDefault();
    if (movementDraft.from && movementDraft.to && movementDraft.from > movementDraft.to) {
      setMovementError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return;
    }
    setMovementQuery({ date_from: movementDraft.from || undefined, date_to: movementDraft.to || undefined,
      product_id: id(movementDraft.product), variant_id: id(movementDraft.variant),
      source_type: movementDraft.type || undefined, actor_id: id(movementDraft.actor),
      search: movementDraft.search.trim() || undefined, page: 1, limit: 20 });
  };
  const print = (element: HTMLElement | null, title: string) => element && void printA4Element({ element, title, orientation: 'landscape' });

  return <div className="mx-auto max-w-[1450px] space-y-6 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المخزون</h1>
      <p className="mt-2 text-sm text-stone-600">المخزون الحالي لقطة من كميات خيارات المنتجات. الحركات سجل مستقل بتاريخ تسجيلها.</p></header>

    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black text-brand">حالة المخزون الحالية</h2><p className="text-sm text-stone-600">لا تنطبق فلاتر تاريخ الحركات على هذه اللقطة.</p></div>
      {stock && <button className="btn-outline" onClick={() => print(stockPrint.current, 'تقرير المخزون الحالي')}>طباعة الصفحة الحالية / PDF</button>}</div>
      <form onSubmit={applyStock} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="بحث بالمنتج أو الرمز"><input className="rep-control" value={stockDraft.search} onChange={(e) => setStockDraft({ ...stockDraft, search: e.target.value })} /></Field>
        <Field label="التصنيف"><select className="rep-control" value={stockDraft.category} onChange={(e) => setStockDraft({ ...stockDraft, category: e.target.value })}><option value="">كل التصنيفات</option>{categories.map((row) => <option key={row.category_id} value={row.category_id}>{row.name}</option>)}</select></Field>
        <Field label="اللون"><select className="rep-control" value={stockDraft.color} onChange={(e) => setStockDraft({ ...stockDraft, color: e.target.value })}><option value="">كل الألوان</option>{colors.map((row) => <option key={row.color_id} value={row.color_id}>{row.name}</option>)}</select></Field>
        <Field label="حالة المخزون"><select className="rep-control" value={stockDraft.status} onChange={(e) => setStockDraft({ ...stockDraft, status: e.target.value })}><option value="">كل الحالات</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="رقم المنتج"><input type="number" min="1" className="rep-control" value={stockDraft.product} onChange={(e) => setStockDraft({ ...stockDraft, product: e.target.value })} /></Field>
        <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setStockDraft(blankStock); setStockQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
      </form>
      {stockError && <p role="alert" className="rep-error">{stockError}</p>}{stockLoading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل المخزون…</p>}
      {stock && <article ref={stockPrint} className="print-document space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المخزون الحالي" subtitle={`لقطة: ${snapshotTime(stock.snapshot_at)} Asia/Hebron · صفحة ${stock.pagination.page}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="خيارات المنتجات" value={number(stock.summary.variants)} /><Metric label="إجمالي الكمية" value={number(stock.summary.total_quantity)} />
          <Metric label="متوفر" value={number(stock.summary.available)} /><Metric label={`منخفض (1–${stock.low_stock_threshold})`} value={number(stock.summary.low)} />
          <Metric label="نافد (صفر)" value={number(stock.summary.out)} /><Metric label="سالب" value={number(stock.summary.negative)} />
        </div>
        <p className="text-xs text-stone-600">الملخص يتبع فلاتر البحث والتصنيف والمنتج واللون؛ لا يتغير بفلتر الحالة أو الصفحة. متوسط التكلفة معلوماتي فقط، ولا تُحسب قيمة للمخزون.</p>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-stone-100">{['المنتج / الرمز', 'الخيار', 'التصنيف', 'الكمية', 'الحالة', 'متوسط التكلفة', 'سعر البيع'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{stock.items.map((row) => <tr key={row.product_variant_id}><td className="border p-2">{row.product.name}<small className="block text-stone-500">{row.product.code} · #{row.product_variant_id}</small></td><td className="border p-2">{row.color.name} · {row.size}</td><td className="border p-2">{row.category.name}</td><td className="border p-2 font-bold">{number(row.stock_quantity)}</td><td className="border p-2">{statusLabels[row.stock_status]}</td><td className="border p-2">{row.average_cost === null ? 'غير متوفر' : formatMoney(row.average_cost)}</td><td className="border p-2">{formatMoney(row.retail_price)}</td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{stock.items.map((row) => <div key={row.product_variant_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.product.name} · {row.color.name} · {row.size}</b><b>{number(row.stock_quantity)}</b></div><p>{row.product.code} · {row.category.name} · {statusLabels[row.stock_status]}</p><p>متوسط التكلفة: {row.average_cost === null ? 'غير متوفر' : formatMoney(row.average_cost)}</p></div>)}</div>
        {!stock.items.length && <p className="p-4 text-stone-500">لا توجد أصناف مطابقة.</p>}
      </article>}
      {stock && <Pager value={stock.pagination} onPage={(page) => setStockQuery({ ...stockQuery, page })} />}
    </section>

    <section className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-black text-brand">حركات المخزون</h2><p className="text-sm text-stone-600">سجل الحركات كما حُفظ؛ لا يحتوي المصدر على كميات قبل/بعد كل حركة.</p></div>
      {movements && <button className="btn-outline" onClick={() => print(movementPrint.current, 'حركات المخزون')}>طباعة الصفحة الحالية / PDF</button>}</div>
      <form onSubmit={applyMovement} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <RepDateInput label="من تاريخ" value={movementDraft.from} onChange={(from) => setMovementDraft({ ...movementDraft, from })} max={movementDraft.to || undefined} />
        <RepDateInput label="إلى تاريخ" value={movementDraft.to} onChange={(to) => setMovementDraft({ ...movementDraft, to })} min={movementDraft.from || undefined} />
        <Field label="نوع الحركة"><select className="rep-control" value={movementDraft.type} onChange={(e) => setMovementDraft({ ...movementDraft, type: e.target.value })}><option value="">كل الحركات</option>{movements?.available_types.map((type) => <option key={type} value={type}>{movementLabels[type] ?? type}</option>)}</select></Field>
        <Field label="بحث بالمرجع أو الملاحظة"><input className="rep-control" value={movementDraft.search} onChange={(e) => setMovementDraft({ ...movementDraft, search: e.target.value })} /></Field>
        <Field label="رقم المنتج"><input type="number" min="1" className="rep-control" value={movementDraft.product} onChange={(e) => setMovementDraft({ ...movementDraft, product: e.target.value })} /></Field>
        <Field label="رقم الخيار"><input type="number" min="1" className="rep-control" value={movementDraft.variant} onChange={(e) => setMovementDraft({ ...movementDraft, variant: e.target.value })} /></Field>
        <Field label="رقم المنفذ"><input type="number" min="1" className="rep-control" value={movementDraft.actor} onChange={(e) => setMovementDraft({ ...movementDraft, actor: e.target.value })} /></Field>
        <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={() => { setMovementDraft(blankMovement); setMovementQuery({ page: 1, limit: 20 }); }}>إعادة ضبط</button></div>
      </form>
      {movementError && <p role="alert" className="rep-error">{movementError}</p>}{movementLoading && <p className="rounded-xl border bg-white p-4">جارٍ تحميل الحركات…</p>}
      {movements && <article ref={movementPrint} className="print-document space-y-3 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="حركات المخزون" subtitle={`Asia/Hebron · صفحة ${movements.pagination.page} من ${movements.pagination.total_pages || 1}`} />
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'المنتج / الخيار', 'نوع الحركة', 'التغيير', 'المصدر / المرجع', 'المنفذ', 'ملاحظات'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{movements.items.map((row) => <tr key={row.inventory_movement_id}><td className="border p-2">{row.occurred_at_local.replace('T', ' ')}</td><td className="border p-2">{row.product.name} · {row.color.name} · {row.size}<small className="block">{row.product.code} · خيار #{row.product_variant_id}</small></td><td className="border p-2">{movementLabels[row.source_type] ?? row.source_type}</td><td className={`border p-2 font-bold ${row.quantity_change < 0 ? 'text-red-700' : 'text-green-700'}`}>{row.quantity_change > 0 ? '+' : ''}{number(row.quantity_change)}</td><td className="border p-2">{movementRef(row)}</td><td className="border p-2">{row.actor?.name ?? 'غير متاح'}</td><td className="border p-2">{row.notes ?? '—'}</td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{movements.items.map((row) => <div key={row.inventory_movement_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.product.name} · {row.color.name}</b><b>{row.quantity_change > 0 ? '+' : ''}{number(row.quantity_change)}</b></div><p>{movementLabels[row.source_type] ?? row.source_type} · {row.occurred_at_local.replace('T', ' ')}</p><p>{movementRef(row)} · {row.actor?.name ?? 'غير متاح'}</p>{row.notes && <p>{row.notes}</p>}</div>)}</div>
        {!movements.items.length && <p className="p-4 text-stone-500">لا توجد حركات مطابقة.</p>}
      </article>}
      {movements && <Pager value={movements.pagination} onPage={(page) => setMovementQuery({ ...movementQuery, page })} />}
    </section>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="rep-label">{label}</span>{children}</label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{value}</b></div>;
}
function Pager({ value, onPage }: { value: { page: number; total_pages: number; total: number }; onPage: (page: number) => void }) {
  if (value.total_pages <= 1) return null;
  return <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={value.page <= 1} onClick={() => onPage(value.page - 1)}>السابق</button><span>صفحة {value.page} من {value.total_pages} · {number(value.total)} سجل</span><button className="btn-outline" disabled={value.page >= value.total_pages} onClick={() => onPage(value.page + 1)}>التالي</button></div>;
}
