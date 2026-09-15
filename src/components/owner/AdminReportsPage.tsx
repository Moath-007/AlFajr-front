import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import {
  categoriesService,
  companyProfileService,
  reportsService,
  representativesService,
  type CategoryResponseDto,
  type CompanyProfileDataDto,
  type OrderType,
  type OrdersReportResponseDto,
  type ProductReportRowDto,
  type ReportGroupBy,
  type ReportPaginationDto,
  type RepresentativeReportRowDto,
  type RepresentativeResponseDto,
  type SalesReportResponseDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages, formatMoney, formatOrderDate } from "@/components/rep/repOrderUtils";
import PrintHeader, { type PrintFilter } from "@/components/printing/PrintHeader";
import { printA4Element } from "@/utils/printDocument";

type Tab = "sales" | "orders" | "receivables" | "products" | "representatives";
const tabs: { id: Tab; label: string }[] = [
  { id: "sales", label: "المبيعات" },
  { id: "orders", label: "الطلبات" },
  { id: "receivables", label: "التحصيلات" },
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
      orientation: tab === "representatives" ? "landscape" : "portrait",
    });
  };
  return (
    <div ref={printRef} className="admin-reports-print print-document space-y-6">
      <header className="report-print-hide flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black text-gold-dark">
            بيانات مجمّعة من الخادم
          </p>
          <h1 className="mt-1 text-3xl font-black text-brand">التقارير</h1>
          <p className="mt-2 text-sm text-stone-500">
            تقارير تشغيلية للعرض فقط؛ جميع الحسابات والتجميعات ينفذها الباك.
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
        className="report-print-hide overflow-x-auto print:hidden"
      >
        <div className="inline-flex min-w-max rounded-xl border bg-white p-1">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="إجمالي المبيعات"
              value={formatMoney(data.summary.sales_total)}
            />
            <Metric
              label="الطلبات المكتملة"
              value={data.summary.orders_count}
            />
            <Metric
              label="متوسط قيمة الطلب"
              value={formatMoney(data.summary.average_order_value)}
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
  const [draft, setDraft] = useState(initialDate);
  const [query, setQuery] = useState(initialDate);
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
          },
          signal,
        ),
      [query],
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
            }}
          />
        </form>
      }
      state={state}
      onData={setData}
    >
      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="إجمالي المفوتر"
            value={formatMoney(data.invoiced_amount)}
          />
          <Metric label="المدفوع" value={formatMoney(data.paid_amount)} />
          <Metric
            label="المتبقي"
            value={formatMoney(data.remaining_amount)}
            strong
          />
          <Metric
            label="الطلبات المستحقة"
            value={data.outstanding_orders_count}
          />
          <Metric label="غير مدفوعة" value={data.unpaid_orders_count} />
          <Metric
            label="مدفوعة جزئيًا"
            value={data.partially_paid_orders_count}
          />
        </div>
      )}
    </ReportShell>
  );
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
            limit: 20,
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
            limit: 20,
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
            <small className="text-stone-500">{value.orders_count} طلب</small>
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
        formatMoney(x.sales_total),
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
      rows={rows.map((x) => [formatOrderDate(x.period), x.orders_count])}
    />
  );
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
        "المدفوع",
        "المتبقي",
      ]}
      rows={rows.map((x) => [
        x.name,
        x.completed_orders_count,
        x.pending_orders_count,
        formatMoney(x.completed_sales_total),
        formatMoney(x.paid_amount),
        formatMoney(x.remaining_amount),
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
  const filters: PrintFilter[] = [
    { label: "من تاريخ", value: query.from ? formatOrderDate(query.from) : "بداية السجلات" },
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
