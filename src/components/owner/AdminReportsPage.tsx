import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import {
  categoriesService,
  companyProfileService,
  reportsService,
  representativesService,
  type CategoryResponseDto,
  type CompanyProfileDataDto,
  type DiscountsReportResponseDto,
  type OrderType,
  type OrdersReportResponseDto,
  type ProductReportRowDto,
  type ReportGroupBy,
  type ReportPaginationDto,
  type RepresentativeReportRowDto,
  type RepresentativeResponseDto,
  type ReturnsReportResponseDto,
  type SalesReportResponseDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages, formatMoney, formatOrderDate } from "@/components/rep/repOrderUtils";
import PrintHeader, { type PrintFilter } from "@/components/printing/PrintHeader";
import { printA4Element } from "@/utils/printDocument";

type Tab = "sales" | "orders" | "receivables" | "returns" | "discounts" | "products" | "representatives";
const tabs: { id: Tab; label: string }[] = [
  { id: "sales", label: "المبيعات" },
  { id: "orders", label: "الطلبات" },
  { id: "receivables", label: "التحصيلات والذمم" },
  { id: "returns", label: "المردودات" },
  { id: "discounts", label: "الخصومات والمسامحات" },
  { id: "products", label: "المنتجات" },
  { id: "representatives", label: "المناديب" },
];
export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("sales");
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    companyProfileService
      .get(controller.signal)
      .then((result) => setCompany(result.company))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const printReport = async () => {
    if (!printRef.current) return;
    const activeReport = printRef.current.querySelector<HTMLElement>(".print-active");
    if (!activeReport) return;
    const printableReport = activeReport.cloneNode(true) as HTMLElement;
    printableReport.classList.add("print-document");
    await printA4Element({
      element: printableReport,
      title: tabs.find((item) => item.id === tab)?.label || "تقرير",
      orientation: ["representatives", "returns", "discounts"].includes(tab) ? "landscape" : "portrait",
    });
  };
  return (
    <div ref={printRef} className="admin-reports-print print-document space-y-6">
      <header className="report-print-hide flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black text-gold-dark">
            نظرة شاملة
          </p>
          <h1 className="mt-1 text-3xl font-black text-brand">التقارير</h1>
          <p className="mt-2 text-sm text-stone-500">
            تابع المبيعات والطلبات والمستحقات والخصومات خلال الفترة التي تختارها.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void printReport()}
          className="btn-outline report-print-hide shrink-0"
        >
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </button>
      </header>
      <nav
        aria-label="أنواع التقارير"
        data-print-ignore
        className="report-print-hide print:hidden"
      >
        <div className="grid grid-cols-2 gap-1 rounded-xl border bg-white p-1 sm:grid-cols-3 lg:grid-cols-7">
          {tabs.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`min-h-10 rounded-lg px-4 text-sm font-black ${tab === x.id ? "bg-brand text-white" : "text-stone-600"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </nav>
      <div className={tab === "sales" ? "print-active" : "hidden"}>
        <SalesReport company={company} />
      </div>
      <div className={tab === "orders" ? "print-active" : "hidden"}>
        <OrdersReport company={company} />
      </div>
      <div className={tab === "receivables" ? "print-active" : "hidden"}>
        <ReceivablesReport company={company} />
      </div>
      <div className={tab === "returns" ? "print-active" : "hidden"}>
        <ReturnsReport company={company} />
      </div>
      <div className={tab === "discounts" ? "print-active" : "hidden"}>
        <DiscountsReport company={company} />
      </div>
      <div className={tab === "products" ? "print-active" : "hidden"}>
        <ProductsReport company={company} />
      </div>
      <div className={tab === "representatives" ? "print-active" : "hidden"}>
        <RepresentativesReport company={company} />
      </div>
    </div>
  );
}

type DateDraft = { from: string; to: string; group: ReportGroupBy };
const initialDate: DateDraft = { from: "", to: "", group: "day" };
function SalesReport({ company }: { company: CompanyProfileDataDto | null }) {
  const [draft, setDraft] = useState(initialDate);
  const [query, setQuery] = useState(initialDate);
  const [data, setData] = useState<SalesReportResponseDto | null>(null);
  const state = useLoad(
    useCallback(
      (signal) =>
        reportsService.sales(
          {
            date_from: query.from || undefined,
            date_to: query.to || undefined,
            group_by: query.group,
          },
          signal,
        ),
      [query],
    ),
  );
  return (
    <ReportShell
      title="تقرير المبيعات المكتملة"
      printHeader={<PrintHeader company={company} title="تقرير المبيعات المكتملة" filters={dateFilters(query, true)} />}
      filters={
        <DateFilters
          value={draft}
          setValue={setDraft}
          grouping
          apply={() => setQuery(draft)}
          reset={() => {
            setDraft(initialDate);
            setQuery(initialDate);
          }}
        />
      }
      state={state}
      onData={setData}
    >
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="صافي المبيعات"
              value={formatMoney(data.summary.sales_total)}
              strong
            />
            <Metric
              label="إجمالي المبيعات قبل المردود"
              value={formatMoney(data.summary.gross_sales_total)}
            />
            <Metric
              label="مردودات المبيعات"
              value={formatMoney(data.summary.sales_returns_total)}
            />
            <Metric
              label="الطلبات المكتملة"
              value={data.summary.orders_count}
            />
          </div>
          <SalesByType data={data.by_type} />
          <SalesSeries rows={data.series} />
        </>
      )}
    </ReportShell>
  );
}
function OrdersReport({ company }: { company: CompanyProfileDataDto | null }) {
  const ordersInitialDate: DateDraft = { from: "", to: "", group: "month" };
  const [draft, setDraft] = useState(ordersInitialDate);
  const [query, setQuery] = useState(ordersInitialDate);
  const [data, setData] = useState<OrdersReportResponseDto | null>(null);
  const state = useLoad(
    useCallback(
      (signal) =>
        reportsService.orders(
          {
            date_from: query.from || undefined,
            date_to: query.to || undefined,
            group_by: query.group,
          },
          signal,
        ),
      [query],
    ),
  );
  return (
    <ReportShell
      title="تقرير أعداد الطلبات"
      printHeader={<PrintHeader company={company} title="تقرير أعداد الطلبات" filters={dateFilters(query, true)} />}
      filters={
        <DateFilters
          value={draft}
          setValue={setDraft}
          apply={() => setQuery(draft)}
          reset={() => {
            setDraft(ordersInitialDate);
            setQuery(ordersInitialDate);
          }}
        />
      }
      state={state}
      onData={setData}
    >
      {data && (
        <>
          <OrderBreakdown
            title="حسب الحالة"
            items={[
              ["معلّق", data.by_status.pending],
              ["مكتمل", data.by_status.completed],
              ["ملغي", data.by_status.cancelled],
            ]}
          />
          <OrderBreakdown
            title="حسب النوع"
            items={[
              ["أونلاين", data.by_type.retail],
              ["جملة", data.by_type.wholesale],
              ["بيع محل", data.by_type.store_sale],
            ]}
          />
          <OrdersSeries rows={data.series} />
        </>
      )}
    </ReportShell>
  );
}
function ReceivablesReport({ company }: { company: CompanyProfileDataDto | null }) {
  const [draft, setDraft] = useState({ from: "", to: "", type: "", rep: "" });
  const [query, setQuery] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof reportsService.receivables>
  > | null>(null);
  const reps = useLookupRepresentatives();
  const state = useLoad(
    useCallback(
      (signal) =>
        reportsService.receivables(
          {
            date_from: query.from || undefined,
            date_to: query.to || undefined,
            order_type: (query.type as OrderType) || undefined,
            representative_id: query.rep ? Number(query.rep) : undefined,
            page,
            limit: 10,
          },
          signal,
        ),
      [page, query],
    ),
  );
  const reset = { from: "", to: "", type: "", rep: "" };
  return (
    <ReportShell
      title="ملخص المستحقات"
      printHeader={
        <PrintHeader
          company={company}
          title="ملخص المستحقات"
          filters={[
            ...dateFilters(query),
            { label: "نوع الطلب", value: typeOptions.find((item) => item.value === query.type)?.label || "كل الأنواع" },
            { label: "المندوب", value: reps.items.find((item) => String(item.user_id) === query.rep)?.name || "كل المناديب" },
          ]}
        />
      }
      warning={reps.warning}
      retryLookup={reps.retry}
      filters={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(draft);
          }}
          className="report-filters"
        >
          <RepDateInput
            label="من تاريخ"
            value={draft.from}
            onChange={(v) => setDraft({ ...draft, from: v })}
            max={draft.to || undefined}
          />
          <RepDateInput
            label="إلى تاريخ"
            value={draft.to}
            onChange={(v) => setDraft({ ...draft, to: v })}
            min={draft.from || undefined}
          />
          <RepSelect
            label="نوع الطلب"
            value={draft.type}
            onChange={(v) => setDraft({ ...draft, type: v })}
            options={typeOptions}
          />
          <RepSelect
            label="المندوب"
            value={draft.rep}
            onChange={(v) => setDraft({ ...draft, rep: v })}
            options={[
              { value: "", label: "كل المناديب" },
              ...reps.items.map((x) => ({
                value: String(x.user_id),
                label: x.name,
              })),
            ]}
          />
          <FilterButtons
            reset={() => {
              setDraft(reset);
              setQuery(reset);
              setPage(1);
            }}
          />
        </form>
      }
      state={state}
      onData={setData}
    >
      {data && <div className="space-y-5">
        <section>
          <h3 className="mb-3 font-black text-brand">التحصيلات خلال الفترة المحددة</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="إجمالي المقبوض" value={formatMoney(data.collected_amount)} strong />
            <Metric label="عدد سندات القبض" value={data.receipts_count} />
            <Metric label="نقد" value={formatMoney(data.cash_amount)} />
            <Metric label="شيكات" value={formatMoney(data.checks_amount)} />
          </div>
        </section>
        <section>
          <h3 className="mb-3 font-black text-brand">الذمم الحالية (لا تتأثر بفترة التحصيل)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="إجمالي المطلوب من الزبائن" value={formatMoney(data.remaining_amount)} strong />
            <Metric label="زبائن عليهم رصيد" value={data.outstanding_orders_count} />
          </div>
        </section>
        <FixedReportRows
          title="سندات القبض"
          headers={["السند", "التاريخ", "الزبون", "الطريقة", "المبلغ", "المستخدم"]}
          rows={data.collections.map((row) => [
            `#${row.payment_id}`,
            formatOrderDate(row.paid_at),
            row.customer.name,
            paymentMethodLabel(row.payment_method),
            formatMoney(row.amount),
            row.recorded_by || "النظام",
          ])}
        />
        <Pagination page={page} pagination={data.pagination} setPage={setPage} />
      </div>}
    </ReportShell>
  );
}

function ReturnsReport({ company }: { company: CompanyProfileDataDto | null }) {
  const empty = { from: "", to: "", type: "" };
  const [draft, setDraft] = useState(empty);
  const [query, setQuery] = useState(empty);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReturnsReportResponseDto | null>(null);
  const state = useLoad(useCallback((signal) => reportsService.returns({
    date_from: query.from || undefined,
    date_to: query.to || undefined,
    return_type: (query.type as "SalesReturn" | "PurchaseReturn") || undefined,
    page,
    limit: 10,
  }, signal), [page, query]));
  return <ReportShell
    title="تقرير المردودات"
    printHeader={<PrintHeader company={company} title="تقرير المردودات" filters={[
      ...dateFilters(query),
      { label: "نوع المردود", value: query.type === "SalesReturn" ? "مردود مبيعات" : query.type === "PurchaseReturn" ? "مردود مشتريات" : "كل المردودات" },
    ]} />}
    filters={<form className="report-filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(draft); }}>
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <RepSelect label="نوع المردود" value={draft.type} onChange={(type) => setDraft({ ...draft, type })} options={[
        { value: "", label: "كل المردودات" },
        { value: "SalesReturn", label: "مردود مبيعات" },
        { value: "PurchaseReturn", label: "مردود مشتريات" },
      ]} />
      <FilterButtons reset={() => { setDraft(empty); setQuery(empty); setPage(1); }} />
    </form>}
    state={state}
    onData={setData}
  >
    {data && <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="قيمة مردود المبيعات" value={formatMoney(data.summary.sales_returns_total)} />
        <Metric label="عدد مردودات المبيعات" value={data.summary.sales_returns_count} />
        <Metric label="قيمة مردود المشتريات" value={formatMoney(data.summary.purchase_returns_total)} />
        <Metric label="عدد مردودات المشتريات" value={data.summary.purchase_returns_count} />
      </div>
      <FixedReportRows title="المردودات" headers={["المردود", "التاريخ", "النوع", "الزبون", "المصدر", "الأصناف", "القيمة", "المستخدم"]} rows={data.returns.map((row) => [
        `#${row.customer_return_id}`,
        formatOrderDate(row.created_at),
        row.return_type === "SalesReturn" ? "مردود مبيعات" : "مردود مشتريات",
        row.customer.name,
        row.source_id ? `#${row.source_id}` : "مباشر",
        row.items_count,
        formatMoney(row.total_amount),
        row.created_by,
      ])} />
      <Pagination page={page} pagination={data.pagination} setPage={setPage} />
    </div>}
  </ReportShell>;
}
function DiscountsReport({ company }: { company: CompanyProfileDataDto | null }) {
  const [draft, setDraft] = useState({ from: "", to: "", group: "day" as ReportGroupBy });
  const [query, setQuery] = useState(draft);
  const [data, setData] = useState<DiscountsReportResponseDto | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [writeOffsPage, setWriteOffsPage] = useState(1);
  const state = useLoad(useCallback((signal) => reportsService.discounts({ date_from: query.from || undefined, date_to: query.to || undefined }, signal), [query]));
  return <ReportShell
    title="تقرير الخصومات والمسامحات"
    printHeader={<PrintHeader company={company} title="تقرير الخصومات والمسامحات" filters={dateFilters(query)}/>}
    filters={<DateFilters value={draft} setValue={setDraft} apply={() => { setOrdersPage(1); setWriteOffsPage(1); setQuery(draft); }} reset={() => { const empty = { from: "", to: "", group: "day" as ReportGroupBy }; setDraft(empty); setQuery(empty); setOrdersPage(1); setWriteOffsPage(1); }}/>} 
    state={state}
    onData={setData}
  >
    {data && <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="خصومات الأصناف" value={formatMoney(data.summary.product_discounts_total)}/>
        <Metric label="خصومات الطلبات" value={formatMoney(data.summary.order_discounts_total)}/>
        <Metric label="المسامحات" value={formatMoney(data.summary.write_offs_total)}/>
        <Metric label="إجمالي التنازلات" value={formatMoney(data.summary.total_concessions)} strong/>
      </div>
      <section><h3 className="mb-3 font-black text-brand">الطلبات التي عليها خصم ({data.summary.discounted_orders_count})</h3>{data.orders.length ? <><div className="report-desktop-table overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-stone-50"><tr><th className="p-3 text-right">الطلب</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الزبون</th><th className="p-3 text-right">نفّذها</th><th className="p-3 text-right">خصم الأصناف</th><th className="p-3 text-right">خصم الطلب</th><th className="p-3 text-right">إجمالي الخصم</th></tr></thead><tbody className="divide-y">{data.orders.slice((ordersPage - 1) * 10, ordersPage * 10).map((row) => <tr key={row.order_id}><td className="p-3 font-bold">#{row.order_id} · {reportOrderType(row.order_type)}</td><td className="p-3">{formatOrderDate(row.created_at)}</td><td className="p-3">{row.customer.name}</td><td className="p-3 font-bold text-brand">{row.performed_by?.name ?? (row.order_type === "Retail" ? "الموقع الإلكتروني" : "غير مسجّل")}</td><td className="p-3">{formatMoney(row.product_discount)}</td><td className="p-3">{formatMoney(row.order_discount)}</td><td className="p-3 font-black">{formatMoney(row.total_discount)}</td></tr>)}</tbody></table></div><Pagination page={ordersPage} pagination={localPagination(ordersPage, data.orders.length)} setPage={setOrdersPage} /></> : <EmptyState title="لا توجد طلبات عليها خصومات ضمن الفترة"/>}</section>
      <section><h3 className="mb-3 font-black text-brand">المسامحات الفعالة ({data.summary.write_offs_count})</h3>{data.write_offs.length ? <><div className="report-desktop-table overflow-x-auto rounded-xl border"><table className="w-full min-w-[760px] text-sm"><thead className="bg-stone-50"><tr><th className="p-3 text-right">المسامحة</th><th className="p-3 text-right">التاريخ</th><th className="p-3 text-right">الزبون</th><th className="p-3 text-right">التخصيص</th><th className="p-3 text-right">نفّذها</th><th className="p-3 text-right">القيمة</th></tr></thead><tbody className="divide-y">{data.write_offs.slice((writeOffsPage - 1) * 10, writeOffsPage * 10).map((row) => <tr key={row.write_off_id}><td className="p-3"><b>#{row.write_off_id}</b>{row.notes && <small className="block text-stone-500">{row.notes}</small>}</td><td className="p-3">{formatOrderDate(row.created_at)}</td><td className="p-3">{row.customer.name}</td><td className="p-3 text-xs">{[...row.order_allocations.map((item) => `طلب #${item.order_id}: ${formatMoney(item.amount)}`), ...row.debt_allocations.map((item) => `دين #${item.customer_debt_id}: ${formatMoney(item.amount)}`)].join(" · ") || "—"}</td><td className="p-3 font-bold text-brand">{row.created_by?.name ?? "النظام"}</td><td className="p-3 font-black">{formatMoney(row.amount)}</td></tr>)}</tbody></table></div><Pagination page={writeOffsPage} pagination={localPagination(writeOffsPage, data.write_offs.length)} setPage={setWriteOffsPage} /></> : <EmptyState title="لا توجد مسامحات فعالة ضمن الفترة"/>}</section>
    </div>}
  </ReportShell>;
}
function reportOrderType(type: OrderType) { return type === "Retail" ? "أونلاين" : type === "Wholesale" ? "جملة" : "بيع محل"; }
function paymentMethodLabel(method: string) {
  if (method === "Cash") return "نقد";
  if (method === "Check") return "شيك";
  if (method === "BankTransfer") return "تحويل بنكي";
  return method || "—";
}

function ProductsReport({ company }: { company: CompanyProfileDataDto | null }) {
  const [draft, setDraft] = useState({
    from: "",
    to: "",
    rank: "quantity",
    category: "",
  });
  const [query, setQuery] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    products: ProductReportRowDto[];
    pagination: ReportPaginationDto;
  } | null>(null);
  const categories = useLookupCategories();
  const state = useLoad(
    useCallback(
      (signal) =>
        reportsService.products(
          {
            date_from: query.from || undefined,
            date_to: query.to || undefined,
            rank_by: query.rank as "quantity" | "revenue",
            category_id: query.category ? Number(query.category) : undefined,
            page,
            limit: 10,
          },
          signal,
        ),
      [page, query],
    ),
  );
  const reset = { from: "", to: "", rank: "quantity", category: "" };
  return (
    <ReportShell
      title="ترتيب مبيعات المنتجات"
      printHeader={
        <PrintHeader
          company={company}
          title="ترتيب مبيعات المنتجات"
          filters={[
            ...dateFilters(query),
            { label: "الترتيب", value: query.rank === "revenue" ? "حسب الإيراد" : "حسب الكمية" },
            { label: "التصنيف", value: categories.items.find((item) => String(item.category_id) === query.category)?.name || "كل التصنيفات" },
            ...(data?.pagination.total_pages && data.pagination.total_pages > 1 ? [{ label: "صفحة البيانات", value: `${page} من ${data.pagination.total_pages}` }] : []),
          ]}
        />
      }
      warning={categories.warning}
      retryLookup={categories.retry}
      filters={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(draft);
          }}
          className="report-filters"
        >
          <RepDateInput
            label="من تاريخ"
            value={draft.from}
            onChange={(v) => setDraft({ ...draft, from: v })}
            max={draft.to || undefined}
          />
          <RepDateInput
            label="إلى تاريخ"
            value={draft.to}
            onChange={(v) => setDraft({ ...draft, to: v })}
            min={draft.from || undefined}
          />
          <RepSelect
            label="الترتيب"
            value={draft.rank}
            onChange={(v) => setDraft({ ...draft, rank: v })}
            options={[
              { value: "quantity", label: "حسب الكمية" },
              { value: "revenue", label: "حسب الإيراد" },
            ]}
          />
          <RepSelect
            label="التصنيف"
            value={draft.category}
            onChange={(v) => setDraft({ ...draft, category: v })}
            options={[
              { value: "", label: "كل التصنيفات" },
              ...categories.items.map((x) => ({
                value: String(x.category_id),
                label: x.name,
              })),
            ]}
          />
          <FilterButtons
            reset={() => {
              setDraft(reset);
              setQuery(reset);
              setPage(1);
            }}
          />
        </form>
      }
      state={state}
      onData={setData}
    >
      {data && (
        <>
          <ProductRows rows={data.products} />
          <Pagination
            page={page}
            pagination={data.pagination}
            setPage={setPage}
          />
        </>
      )}
    </ReportShell>
  );
}
function RepresentativesReport({ company }: { company: CompanyProfileDataDto | null }) {
  const [draft, setDraft] = useState({
    from: "",
    to: "",
    rep: "",
    sort: "completed_sales_total:desc",
  });
  const [query, setQuery] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    representatives: RepresentativeReportRowDto[];
    pagination: ReportPaginationDto;
  } | null>(null);
  const reps = useLookupRepresentatives();
  const state = useLoad(
    useCallback(
      (signal) => {
        const [sort_by, sort_order] = query.sort.split(":") as [
          "completed_sales_total" | "completed_orders_count" | "name",
          "asc" | "desc",
        ];
        return reportsService.representatives(
          {
            date_from: query.from || undefined,
            date_to: query.to || undefined,
            representative_id: query.rep ? Number(query.rep) : undefined,
            page,
            limit: 10,
            sort_by,
            sort_order,
          },
          signal,
        );
      },
      [page, query],
    ),
  );
  const reset = {
    from: "",
    to: "",
    rep: "",
    sort: "completed_sales_total:desc",
  };
  return (
    <ReportShell
      title="أداء المناديب لطلبات الجملة"
      printHeader={
        <PrintHeader
          company={company}
          title="أداء المناديب لطلبات الجملة"
          filters={[
            ...dateFilters(query),
            { label: "المندوب", value: reps.items.find((item) => String(item.user_id) === query.rep)?.name || "كل المناديب" },
            { label: "الترتيب", value: representativeSortLabel(query.sort) },
            ...(data?.pagination.total_pages && data.pagination.total_pages > 1 ? [{ label: "صفحة البيانات", value: `${page} من ${data.pagination.total_pages}` }] : []),
          ]}
        />
      }
      warning={reps.warning}
      retryLookup={reps.retry}
      filters={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(draft);
          }}
          className="report-filters"
        >
          <RepDateInput
            label="من تاريخ"
            value={draft.from}
            onChange={(v) => setDraft({ ...draft, from: v })}
            max={draft.to || undefined}
          />
          <RepDateInput
            label="إلى تاريخ"
            value={draft.to}
            onChange={(v) => setDraft({ ...draft, to: v })}
            min={draft.from || undefined}
          />
          <RepSelect
            label="المندوب"
            value={draft.rep}
            onChange={(v) => setDraft({ ...draft, rep: v })}
            options={[
              { value: "", label: "كل المناديب" },
              ...reps.items.map((x) => ({
                value: String(x.user_id),
                label: x.name,
              })),
            ]}
          />
          <RepSelect
            label="الترتيب"
            value={draft.sort}
            onChange={(v) => setDraft({ ...draft, sort: v })}
            options={[
              { value: "completed_sales_total:desc", label: "أعلى مبيعات" },
              {
                value: "completed_orders_count:desc",
                label: "أكثر طلبات مكتملة",
              },
              { value: "name:asc", label: "الاسم" },
            ]}
          />
          <FilterButtons
            reset={() => {
              setDraft(reset);
              setQuery(reset);
              setPage(1);
            }}
          />
        </form>
      }
      state={state}
      onData={setData}
    >
      {data && (
        <>
          <RepresentativeRows rows={data.representatives} />
          <Pagination
            page={page}
            pagination={data.pagination}
            setPage={setPage}
          />
        </>
      )}
    </ReportShell>
  );
}

type LoadState<T> = {
  loading: boolean;
  errors: string[];
  data: T | null;
  retry: () => void;
};
function useLoad<T>(loader: (signal: AbortSignal) => Promise<T>): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setErrors([]);
    loader(c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setErrors(apiMessages(e, "تعذر تحميل التقرير."));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [attempt, loader]);
  return { loading, errors, data, retry: () => setAttempt((x) => x + 1) };
}
function ReportShell<T>({
  title,
  subtitle,
  printHeader,
  filters,
  state,
  onData,
  children,
  warning = [],
  retryLookup,
}: {
  title: string;
  subtitle?: string;
  printHeader: React.ReactNode;
  filters: React.ReactNode;
  state: LoadState<T>;
  onData: (data: T) => void;
  children: React.ReactNode;
  warning?: string[];
  retryLookup?: () => void;
}) {
  useEffect(() => {
    if (state.data) onData(state.data);
  }, [onData, state.data]);
  return (
    <section className="space-y-5">
      {printHeader}
      <div className="report-print-hide">
        <h2 className="text-xl font-black text-brand">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm font-bold text-amber-800">{subtitle}</p>
        )}
      </div>
      <div className="report-print-hide rounded-2xl border bg-white p-4">
        {filters}
        {warning.length > 0 && (
          <div className="mt-3 flex justify-between gap-3 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800">
            <span>{warning.join("، ")}</span>
            <button onClick={retryLookup} className="underline">
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
      {state.errors.length > 0 && (
        <ErrorBox errors={state.errors} retry={state.retry} />
      )}{" "}
      {state.loading ? (
        <Skeleton className="h-72" />
      ) : state.data ? (
        children
      ) : null}
    </section>
  );
}
function DateFilters({
  value,
  setValue,
  grouping,
  apply,
  reset,
}: {
  value: DateDraft;
  setValue: (v: DateDraft) => void;
  grouping?: boolean;
  apply: () => void;
  reset: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="report-filters"
    >
      <RepDateInput
        label="من تاريخ"
        value={value.from}
        onChange={(v) => setValue({ ...value, from: v })}
        max={value.to || undefined}
      />
      <RepDateInput
        label="إلى تاريخ"
        value={value.to}
        onChange={(v) => setValue({ ...value, to: v })}
        min={value.from || undefined}
      />
      {grouping && (
        <RepSelect
          label="التجميع"
          value={value.group}
          onChange={(v) => setValue({ ...value, group: v as ReportGroupBy })}
          options={[
            { value: "day", label: "يومي" },
            { value: "week", label: "أسبوعي" },
            { value: "month", label: "شهري" },
          ]}
        />
      )}
      <FilterButtons reset={reset} />
    </form>
  );
}
function FilterButtons({ reset }: { reset: () => void }) {
  return (
    <div className="flex items-end gap-2">
      <button className="min-h-11 rounded-xl bg-brand px-5 font-black text-white">
        تطبيق
      </button>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-xl border px-4 font-bold"
      >
        إعادة تعيين
      </button>
    </div>
  );
}
function SalesByType({ data }: { data: SalesReportResponseDto["by_type"] }) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h3 className="font-black text-brand">المبيعات حسب نوع الطلب</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["أونلاين", data.retail],
            ["جملة", data.wholesale],
            ["بيع محل", data.store_sale],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl bg-stone-50 p-3">
            <span className="text-xs font-bold text-stone-500">{label}</span>
            <b className="mt-1 block text-lg text-brand">
              {formatMoney(value.sales_total)}
            </b>
            <small className="text-stone-500">{value.orders_count} طلب · مردود {formatMoney(value.returns_total)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderBreakdown({
  title,
  items,
}: {
  title: string;
  items: [string, number][];
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h3 className="font-black text-brand">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-stone-50 p-3">
            <span className="text-xs font-bold text-stone-500">{label}</span>
            <b className="mt-1 block text-lg text-brand">{value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function SalesSeries({ rows }: { rows: SalesReportResponseDto["series"] }) {
  return (
    <FixedReportRows
      title="الفترات"
      headers={["الفترة", "المبيعات", "عدد الطلبات"]}
      rows={rows.map((x) => [
        formatOrderDate(x.period),
        Number(x.sales_total) < 0
          ? `مردود ${formatMoney(Math.abs(Number(x.sales_total)))}`
          : formatMoney(x.sales_total),
        x.orders_count,
      ])}
    />
  );
}

function OrdersSeries({ rows }: { rows: OrdersReportResponseDto["series"] }) {
  return (
    <FixedReportRows
      title="الفترات"
      headers={["الفترة", "عدد الطلبات"]}
      rows={rows.map((x) => [formatReportMonth(x.period), x.orders_count])}
    />
  );
}

function formatReportMonth(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("ar", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jerusalem",
      }).format(date);
}

function ProductRows({ rows }: { rows: ProductReportRowDto[] }) {
  return (
    <FixedReportRows
      title="المنتجات"
      headers={["المنتج", "الكود", "الكمية المباعة", "الإيراد"]}
      rows={rows.map((x) => [
        x.name,
        x.code,
        x.quantity_sold,
        formatMoney(x.revenue),
      ])}
    />
  );
}

function RepresentativeRows({ rows }: { rows: RepresentativeReportRowDto[] }) {
  return (
    <FixedReportRows
      title="المناديب"
      headers={[
        "المندوب",
        "المكتملة",
        "المعلقة",
        "المبيعات المكتملة",
      ]}
      rows={rows.map((x) => [
        x.name,
        x.completed_orders_count,
        x.pending_orders_count,
        formatMoney(x.completed_sales_total),
      ])}
    />
  );
}

function FixedReportRows({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (!rows.length) return <EmptyState title={`لا توجد بيانات في ${title}`} />;
  return (
    <section className="rounded-2xl border bg-white">
      <h3 className="p-5 font-black text-brand">{title}</h3>
      <div className="report-desktop-table hidden overflow-x-auto md:block">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-stone-50">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-right">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => (
                  <td key={headers[columnIndex]} className="px-4 py-3">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="report-mobile-cards space-y-3 p-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            key={rowIndex}
            className="grid gap-2 rounded-xl bg-stone-50 p-4 sm:grid-cols-2"
          >
            {row.map((value, columnIndex) => (
              <div key={headers[columnIndex]}>
                <span className="text-xs text-stone-500">
                  {headers[columnIndex]}
                </span>
                <b className="block break-words">{value}</b>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
function Metric({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-white p-5 ${strong ? "border-red-200" : ""}`}
    >
      <span className="text-sm font-bold text-stone-500">{label}</span>
      <b
        className={`mt-2 block text-2xl ${strong ? "text-red-700" : "text-brand"}`}
      >
        {value}
      </b>
    </article>
  );
}
function Pagination({
  page,
  pagination,
  setPage,
}: {
  page: number;
  pagination: ReportPaginationDto;
  setPage: (page: number) => void;
}) {
  return pagination.total_pages > 1 ? (
    <div className="flex justify-center gap-3">
      <button
        className="btn-outline"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        السابق
      </button>
      <span className="py-2 text-sm font-bold">
        {page} / {pagination.total_pages}
      </span>
      <button
        className="btn-outline"
        disabled={page >= pagination.total_pages}
        onClick={() => setPage(page + 1)}
      >
        التالي
      </button>
    </div>
  ) : null;
}
function localPagination(page: number, total: number): ReportPaginationDto {
  return { page, limit: 10, total, total_pages: Math.ceil(total / 10) };
}
function ErrorBox({ errors, retry }: { errors: string[]; retry: () => void }) {
  return (
    <div className="rep-error text-center">
      {errors.join("، ")}
      <button onClick={retry} className="mx-auto mt-2 flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        إعادة المحاولة
      </button>
    </div>
  );
}
const typeOptions = [
  { value: "", label: "كل الأنواع" },
  { value: "Retail", label: "أونلاين" },
  { value: "Wholesale", label: "جملة" },
  { value: "StoreSale", label: "بيع محل" },
];

function dateFilters(query: { from: string; to: string; group?: ReportGroupBy }, grouping = false): PrintFilter[] {
  const usesDefaultMonth = !query.from && !query.to;
  const filters: PrintFilter[] = [
    { label: "من تاريخ", value: query.from ? formatOrderDate(query.from) : usesDefaultMonth ? "بداية الشهر الحالي" : "حسب الفترة" },
    { label: "إلى تاريخ", value: query.to ? formatOrderDate(query.to) : "حتى اليوم" },
  ];
  if (grouping) {
    const labels: Record<ReportGroupBy, string> = { day: "يومي", week: "أسبوعي", month: "شهري" };
    filters.push({ label: "التجميع", value: labels[query.group || "day"] });
  }
  return filters;
}

function representativeSortLabel(value: string) {
  if (value === "completed_orders_count:desc") return "أكثر طلبات مكتملة";
  if (value === "name:asc") return "الاسم";
  return "أعلى مبيعات";
}

function useLookupRepresentatives() {
  return useLookup<RepresentativeResponseDto>(
    useCallback(
      (signal) =>
        representativesService
          .list(undefined, signal)
          .then((x) => x.representatives),
      [],
    ),
    "تعذر تحميل قائمة المناديب.",
  );
}
function useLookupCategories() {
  return useLookup<CategoryResponseDto>(
    useCallback((signal) => categoriesService.list(signal), []),
    "تعذر تحميل التصنيفات.",
  );
}
function useLookup<T>(
  loader: (signal: AbortSignal) => Promise<T[]>,
  fallback: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [warning, setWarning] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setWarning([]);
    loader(c.signal)
      .then(setItems)
      .catch((e) => {
        if (!c.signal.aborted) setWarning(apiMessages(e, fallback));
      });
    return () => c.abort();
  }, [attempt, fallback, loader]);
  return { items, warning, retry: () => setAttempt((x) => x + 1) };
}
