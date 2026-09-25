import { useEffect, useRef, useState, type FormEvent } from "react";
import { Printer, Search } from "lucide-react";
import {
  companyProfileService,
  customersService,
  type CompanyProfileDataDto,
  type CustomerSelectionDto,
  type CustomerStatementResponseDto,
} from "@/api";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import PrintHeader from "@/components/printing/PrintHeader";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { printA4Element } from "@/utils/printDocument";

export default function AdminCustomerStatementPage() {
  const [search, setSearch] = useState(""),
    [results, setResults] = useState<CustomerSelectionDto[]>([]),
    [selected, setSelected] = useState<CustomerSelectionDto | null>(null);
  const [allPeriod, setAllPeriod] = useState(true),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [query, setQuery] = useState({ all: true, from: "", to: "" });
  const [statement, setStatement] =
      useState<CustomerStatementResponseDto | null>(null),
    [company, setCompany] = useState<CompanyProfileDataDto | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    companyProfileService
      .get(c.signal)
      .then((r) => setCompany(r.company))
      .catch(() => undefined);
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (!search.trim() || selected) {
      setResults([]);
      return;
    }
    const c = new AbortController(),
      timer = window.setTimeout(() => {
        customersService
          .list({ search: search.trim(), page: 1, limit: 20 }, c.signal)
          .then((r) => setResults(r.customers))
          .catch(() => setResults([]));
      }, 250);
    return () => {
      window.clearTimeout(timer);
      c.abort();
    };
  }, [search, selected]);
  useEffect(() => {
    if (!selected) {
      setStatement(null);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    setError("");
    customersService
      .statement(
        selected.customer_id,
        query.all
          ? {}
          : {
              date_from: query.from || undefined,
              date_to: query.to || undefined,
            },
        c.signal,
      )
      .then(setStatement)
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل كشف الحساب.").join("، "));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [query, selected]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (from && to && from > to)
      return setError("تاريخ البداية يجب أن يسبق تاريخ النهاية.");
    setQuery({ all: allPeriod, from, to });
  };
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">وثيقة مالية كاملة</p>
        <h1 className="mt-1 text-3xl font-black text-brand">كشف حساب الزبون</h1>
        <p className="mt-2 text-sm text-stone-500">
          اختر الزبون والفترة لعرض الكشف الكامل وطباعته أو حفظه PDF.
        </p>
      </header>
      <section className="rounded-2xl border bg-white p-5">
        <form
          onSubmit={apply}
          className="grid items-end gap-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"
        >
          <div className="relative">
            <label className="rep-label">الزبون</label>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="rep-control pr-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelected(null);
                }}
                placeholder="ابحث بالاسم أو رقم الهاتف"
              />
            </span>
            {results.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl">
                {results.map((customer) => (
                  <button
                    key={customer.customer_id}
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-right hover:bg-stone-50"
                    onClick={() => {
                      setSelected(customer);
                      setSearch(`${customer.name} — ${customer.phone}`);
                      setResults([]);
                    }}
                  >
                    <b className="block text-brand">{customer.name}</b>
                    <small>{customer.phone}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <label>
            <span className="rep-label">من تاريخ</span>
            <input
              type="date"
              className="rep-control"
              disabled={allPeriod}
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            <span className="rep-label">إلى تاريخ</span>
            <input
              type="date"
              className="rep-control"
              disabled={allPeriod}
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="btn-primary min-h-11" disabled={!selected}>
            عرض الكشف
          </button>
          <label
            className={`flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition lg:col-span-full ${allPeriod ? "border-brand/30 bg-brand-50 text-brand" : "border-stone-200 bg-white text-stone-600 hover:border-brand/30"}`}
          >
            <input
              type="checkbox"
              checked={allPeriod}
              onChange={(e) => setAllPeriod(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-stone-300 bg-white text-sm font-black text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2"
            >
              ✓
            </span>
            <b className="text-sm">كل الفترة</b>
          </label>
        </form>
      </section>
      {error && <div className="rep-error">{error}</div>}
      {!selected ? (
        <EmptyState title="اختر زبونًا لعرض كشف الحساب" />
      ) : loading ? (
        <Skeleton className="h-[620px]" />
      ) : statement ? (
        <StatementDocument statement={statement} company={company} />
      ) : null}
    </div>
  );
}

function StatementDocument({
  statement,
  company,
}: {
  statement: CustomerStatementResponseDto;
  company: CompanyProfileDataDto | null;
}) {
  const printRef = useRef<HTMLElement>(null),
    period = statement.period.date_from
      ? `${formatOrderDate(statement.period.date_from)} — ${formatOrderDate(statement.period.date_to)}`
      : `كل الفترة حتى ${formatOrderDate(statement.period.date_to)}`;
  return (
    <article
      ref={printRef}
      className="print-document rounded-2xl border bg-white p-5 sm:p-8"
      dir="rtl"
    >
      <PrintHeader
        company={company}
        title="كشف حساب الزبون"
        subtitle={`الفترة: ${period}`}
      />
      <div className="mb-5 flex justify-end" data-print-ignore>
        <button
          className="btn-primary"
          onClick={() =>
            printRef.current &&
            void printA4Element({
              element: printRef.current,
              title: `كشف حساب ${statement.customer.name}`,
              orientation: "portrait",
            })
          }
        >
          <Printer className="h-4 w-4" />
          طباعة / حفظ PDF
        </button>
      </div>
      <header className="report-print-hide border-b pb-5">
        <h2 className="text-2xl font-black text-brand">كشف حساب الزبون</h2>
        <p>الفترة: {period}</p>
      </header>
      <section className="my-5 rounded-xl bg-stone-50 p-4">
        <b className="text-brand">{statement.customer.name}</b>
        <p className="text-sm text-stone-600">
          {statement.customer.phone}
          {statement.customer.email ? ` · ${statement.customer.email}` : ""}
        </p>
      </section>
      <section className="print-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary
          label="رصيد أول المدة"
          value={statement.summary.opening_balance}
          balance
        />
        <Summary
          label="المبيعات والطلبات"
          value={statement.summary.orders_total}
        />
        <Summary
          label="القبض من الزبون"
          value={statement.summary.payments_total}
        />
        <Summary
          label="مشتريات من الزبون"
          value={statement.summary.customer_purchases_total}
        />
        <Summary
          label="مردودات المبيعات"
          value={statement.summary.sales_returns_total}
        />
        <Summary
          label="مردودات المشتريات"
          value={statement.summary.purchase_returns_total}
        />
        <Summary label="المسامحات" value={statement.summary.write_offs_total} />
        <Summary
          label="رصيد آخر المدة"
          value={statement.summary.closing_balance}
          balance
        />
      </section>
      {statement.entries.length > 0 && (
        <section className="report-print-hide mt-6 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black text-brand">ملخص الحركات</h2>
            <span className="text-xs text-stone-500">
              {statement.orders.length} طلب · {statement.entries.length} حركة
              مالية
            </span>
          </div>
          <div className="mt-3 divide-y">
            {statement.entries
              .slice(-10)
              .reverse()
              .map((entry, index) => (
                <div
                  key={`web-${entry.type}-${entry.date}-${index}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <b>{entryTitle(entry)}</b>
                    <p className="text-xs text-stone-500">
                      {formatOrderDate(entry.date)}
                    </p>
                  </div>
                  <b>
                    {Number(entry.debit) > 0
                      ? `مدين ${formatMoney(entry.debit)}`
                      : `دائن ${formatMoney(entry.credit)}`}
                  </b>
                </div>
              ))}
          </div>
          {statement.entries.length > 10 && (
            <p className="mt-3 text-center text-xs text-stone-500">
              باقي التفاصيل تظهر كاملة عند الطباعة أو حفظ PDF.
            </p>
          )}
        </section>
      )}
      {statement.entries.length ? (
        <>
          {statement.orders.length > 0 && (
            <section className="statement-section hidden print-active mt-8">
              <h2 className="border-b-2 border-brand pb-2 text-xl font-black text-brand">
                الطلبات والمبيعات
              </h2>
              <div className="mt-4 space-y-5">
                {statement.orders.map((order) => (
                  <OrderCard key={order.order_id} order={order} />
                ))}
              </div>
            </section>
          )}
          <MovementSection
            title="الدفعات والشيكات"
            entries={statement.entries.filter((entry) =>
              [
                "Payment",
                "Disbursement",
                "ReturnedCheck",
                "PaymentCancelled",
              ].includes(entry.type),
            )}
          />
          <MovementSection
            title="المردودات"
            entries={statement.entries.filter((entry) =>
              ["SalesReturn", "PurchaseReturn", "ReturnCancelled"].includes(
                entry.type,
              ),
            )}
          />
          <MovementSection
            title="مشتريات الزبون"
            entries={statement.entries.filter((entry) =>
              ["CustomerPurchase", "CustomerPurchaseCancelled"].includes(
                entry.type,
              ),
            )}
          />
          <MovementSection
            title="الأرصدة والديون الافتتاحية"
            entries={statement.entries.filter((entry) =>
              [
                "OpeningBalance",
                "OpeningBalanceCancelled",
                "CustomerDebt",
                "CustomerDebtCancelled",
              ].includes(entry.type),
            )}
          />
          <MovementSection
            title="المسامحات"
            entries={statement.entries.filter((entry) =>
              ["WriteOff", "WriteOffCancelled"].includes(entry.type),
            )}
          />
          <section className="statement-section hidden print-active mt-8">
            <h2 className="border-b-2 border-brand pb-2 text-xl font-black text-brand">
              سجل الحساب
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="statement-table w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-100">
                    {[
                      "التاريخ",
                      "البيان",
                      "مدين",
                      "دائن",
                      "الرصيد",
                      "الطريقة / المستخدم",
                    ].map((label) => (
                      <th key={label} className="border p-3 text-right">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statement.entries.map((entry, index) => (
                    <tr key={`${entry.type}-${entry.date}-${index}`}>
                      <td className="whitespace-nowrap border p-3">
                        {formatOrderDate(entry.date)}
                      </td>
                      <td className="border p-3">{entry.description}</td>
                      <td className="border p-3">{formatMoney(entry.debit)}</td>
                      <td className="border p-3">
                        {formatMoney(entry.credit)}
                      </td>
                      <td className="border p-3 font-black">
                        {balanceText(entry.balance)}
                      </td>
                      <td className="border p-3 text-xs">
                        {entry.payment_method === "Cash"
                          ? "نقد"
                          : entry.payment_method === "Check"
                            ? `شيك${entry.check_number ? ` #${entry.check_number}` : ""}`
                            : "—"}
                        {entry.actor?.name ? ` · ${entry.actor.name}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <EmptyState title="لا توجد حركات ضمن الفترة المحددة" />
      )}
    </article>
  );
}
function Summary({
  label,
  value,
  balance = false,
}: {
  label: string;
  value: string;
  balance?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4">
      <span className="text-xs font-bold text-stone-500">{label}</span>
      <b className="mt-2 block text-lg text-brand">
        {balance ? balanceText(value) : formatMoney(value)}
      </b>
    </div>
  );
}

function OrderCard({
  order,
}: {
  order: CustomerStatementResponseDto["orders"][number];
}) {
  return (
    <article className="statement-card rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <b className="text-lg text-brand">
            طلب #{order.order_id} · {orderTypeLabel(order.order_type)}
          </b>
          <p className="text-xs text-stone-500">
            {formatOrderDate(order.created_at)}
            {order.representative_name
              ? ` · المندوب: ${order.representative_name}`
              : ""}
            {order.cancelled_at ? " · ملغى" : ""}
          </p>
        </div>
        <b className="text-lg text-brand">{formatMoney(order.total_amount)}</b>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="bg-stone-100">
              {["الصنف", "الكمية", "سعر الوحدة", "خصم الصنف", "الإجمالي"].map(
                (label) => (
                  <th key={label} className="border p-2 text-right">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.product_code}-${index}`}>
                <td className="border p-2">
                  {item.product_name} · {item.product_code} · {item.size} ·{" "}
                  {item.color}
                  {item.is_bonus ? " · بونص" : ""}
                </td>
                <td className="border p-2">{item.quantity}</td>
                <td className="border p-2">{formatMoney(item.unit_price)}</td>
                <td className="border p-2">
                  {formatMoney(item.product_discount)}
                </td>
                <td className="border p-2 font-bold">
                  {formatMoney(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end border-b pb-3 text-xs">
        <span>
          خصم الطلب
          <br />
          <b>{formatMoney(order.order_discount)}</b>
        </span>
      </div>
    </article>
  );
}

function MovementSection({
  title,
  entries,
}: {
  title: string;
  entries: CustomerStatementResponseDto["entries"];
}) {
  if (!entries.length) return null;
  return (
    <section className="statement-section hidden print-active mt-8">
      <h2 className="border-b-2 border-brand pb-2 text-xl font-black text-brand">
        {title}
      </h2>
      <div className="mt-4 space-y-2">
        {entries.map((entry, index) => (
          <div
            key={`${title}-${entry.type}-${entry.date}-${index}`}
            className="statement-card flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <b className="text-brand">{entryTitle(entry)}</b>
              <p className="mt-1 text-xs text-stone-500">
                {formatOrderDate(entry.date)}
                {entry.actor?.name ? ` · سجلها: ${entry.actor.name}` : ""}
              </p>
            </div>
            <div className="text-left">
              <b>
                {Number(entry.debit) > 0
                  ? `مدين ${formatMoney(entry.debit)}`
                  : `دائن ${formatMoney(entry.credit)}`}
              </b>
              {entry.payment_method && (
                <p className="text-xs text-stone-500">
                  {entry.payment_method === "Cash"
                    ? "نقد"
                    : `شيك${entry.check_number ? ` #${entry.check_number}` : ""}`}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function orderTypeLabel(type: string) {
  return type === "Wholesale"
    ? "جملة"
    : type === "StoreSale"
      ? "بيع محل"
      : "أونلاين";
}

function balanceText(value: string) {
  const amount = Number(value);
  if (amount > 0) return `عليه ${formatMoney(amount)}`;
  if (amount < 0) return `له ${formatMoney(Math.abs(amount))}`;
  return "متوازن — ₪0.00";
}

function entryTitle(entry: CustomerStatementResponseDto["entries"][number]) {
  const labels: Partial<Record<typeof entry.type, string>> = {
    Order: entry.description,
    OrderCancelled: "إلغاء طلب",
    Payment: entry.payment_method === "Check" ? "قبض بشيك" : "قبض نقدي",
    Disbursement:
      entry.payment_method === "Check" ? "دفع للزبون بشيك" : "دفع نقدي للزبون",
    ReturnedCheck: "شيك راجع",
    PaymentCancelled: "إلغاء حركة قبض أو دفع",
    WriteOff: "مسامحة للزبون",
    WriteOffCancelled: "إلغاء مسامحة",
    CustomerDebt: "دين يدوي سابق",
    CustomerDebtCancelled: "إلغاء دين يدوي سابق",
    CustomerPurchase: "شراء من الزبون",
    CustomerPurchaseCancelled: "إلغاء شراء من الزبون",
    OpeningBalance: entry.description,
    OpeningBalanceCancelled: "إلغاء رصيد أو دين افتتاحي",
    SalesReturn: "مردود مبيعات",
    PurchaseReturn: "مردود مشتريات",
    ReturnCancelled: "إلغاء مردود",
  };
  return labels[entry.type] ?? entry.description;
}
