import { useEffect, useRef, useState, type FormEvent } from "react";
import { Printer, RefreshCw, Search } from "lucide-react";
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
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import PrintHeader from "@/components/printing/PrintHeader";
import { printA4Element } from "@/utils/printDocument";

export default function AdminCustomerStatementPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerSelectionDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string[]>([]);
  const [searchRetry, setSearchRetry] = useState(0);
  const [selected, setSelected] = useState<CustomerSelectionDto | null>(null);
  const [allPeriod, setAllPeriod] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ all: true, from: "", to: "" });
  const [statement, setStatement] =
    useState<CustomerStatementResponseDto | null>(null);
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const searchBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    companyProfileService
      .get(controller.signal)
      .then((result) => setCompany(result.company))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (selected && search === `${selected.name} — ${selected.phone}`) return;
    if (!search.trim()) {
      setCustomers([]);
      setSearchError([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError([]);
      customersService
        .list({ search: search.trim(), page: 1, limit: 20 }, controller.signal)
        .then((result) => setCustomers(result.customers))
        .catch((error) => {
          if (!controller.signal.aborted)
            setSearchError(apiMessages(error, "تعذر البحث عن الزبائن."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, searchRetry, selected]);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!searchBox.current?.contains(event.target as Node)) setCustomers([]);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  useEffect(() => {
    if (!selected) {
      setStatement(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setErrors([]);
    customersService
      .statement(
        selected.customer_id,
        applied.all
          ? {}
          : {
              date_from: applied.from || undefined,
              date_to: applied.to || undefined,
            },
        controller.signal,
      )
      .then(setStatement)
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrors(apiMessages(error, "تعذر تحميل كشف الحساب."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, retry, selected]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (from && to && from > to) {
      setErrors(["تاريخ البداية يجب أن يسبق تاريخ النهاية."]);
      return;
    }
    setApplied({ all: allPeriod, from, to });
  };
  const selectCustomer = (customer: CustomerSelectionDto) => {
    setSelected(customer);
    setSearch(`${customer.name} — ${customer.phone}`);
    setCustomers([]);
    setApplied({ all: true, from: "", to: "" });
    setAllPeriod(true);
    setFrom("");
    setTo("");
  };
  return (
    <div className="space-y-6">
      <header className="border-b pb-5 print:hidden">
        <p className="text-xs font-black text-gold-dark">
          وثيقة مالية من الخادم
        </p>
        <h1 className="mt-1 text-3xl font-black text-brand">كشف حساب الزبون</h1>
      </header>
      <section className="rounded-2xl border bg-white p-5 print:hidden">
        <form
          onSubmit={apply}
          className="grid items-end gap-4 lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"
        >
          <div ref={searchBox} className="relative">
            <label htmlFor="customer-statement-search" className="rep-label">
              الزبون
            </label>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="customer-statement-search"
                role="combobox"
                aria-expanded={customers.length > 0}
                aria-controls="customer-search-results"
                autoComplete="off"
                value={search}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setCustomers([]);
                    event.currentTarget.focus();
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    document
                      .querySelector<HTMLElement>(
                        "#customer-search-results [role='option']",
                      )
                      ?.focus();
                  }
                }}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSelected(null);
                }}
                placeholder="ابحث بالاسم أو رقم الهاتف"
                className="rep-control pr-10"
              />
            </span>
            {(customers.length > 0 || searching || searchError.length > 0) && (
              <div
                id="customer-search-results"
                role="listbox"
                className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl"
              >
                {searching ? (
                  <p className="p-3 text-sm text-stone-500">جاري البحث…</p>
                ) : searchError.length ? (
                  <div
                    role="alert"
                    className="p-3 text-sm font-bold text-red-700"
                  >
                    <p>{searchError.join("، ")}</p>
                    <button
                      type="button"
                      onClick={() => setSearchRetry((value) => value + 1)}
                      className="mt-2 inline-flex items-center gap-1 underline"
                    >
                      <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                    </button>
                  </div>
                ) : (
                  customers.map((customer) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={
                        selected?.customer_id === customer.customer_id
                      }
                      key={customer.customer_id}
                      onClick={() => selectCustomer(customer)}
                      className="block min-h-12 w-full rounded-lg px-3 py-2 text-right hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    >
                      <b className="block text-sm text-brand">
                        {customer.name}
                      </b>
                      <span className="text-xs text-stone-500">
                        {customer.phone}
                        {customer.email ? ` · ${customer.email}` : ""}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <label>
            <span className="rep-label">من تاريخ</span>
            <input
              type="date"
              disabled={allPeriod}
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className="rep-control"
            />
          </label>
          <label>
            <span className="rep-label">إلى تاريخ</span>
            <input
              type="date"
              disabled={allPeriod}
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="rep-control"
            />
          </label>
          <button disabled={!selected} className="btn-primary min-h-11">
            عرض الكشف
          </button>
          <label
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition lg:col-span-full ${allPeriod ? "border-brand/30 bg-brand-50" : "border-stone-200 bg-white hover:border-brand-200"}`}
          >
            <input
              type="checkbox"
              checked={allPeriod}
              onChange={(event) => setAllPeriod(event.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-stone-300 bg-white text-sm font-black text-transparent transition peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2"
            >
              ✓
            </span>
            <span className="font-bold text-brand">كل الفترة</span>
          </label>
        </form>
      </section>
      {errors.length > 0 && (
        <div role="alert" className="rep-error print:hidden">
          <p>{errors.join("، ")}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-2 inline-flex items-center gap-2 underline"
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}
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
  const printRef = useRef<HTMLElement>(null);
  const period = statement.period.date_from
    ? `${formatOrderDate(statement.period.date_from)} — ${formatOrderDate(statement.period.date_to)}`
    : `كل الفترة حتى ${formatOrderDate(statement.period.date_to)}`;
  const printStatement = async () => {
    if (!printRef.current) return;
    await printA4Element({
      element: printRef.current,
      title: `كشف حساب ${statement.customer.name}`,
    });
  };
  return (
    <article
      ref={printRef}
      id="customer-statement-document"
      className="statement-document print-document rounded-2xl border bg-white p-5 sm:p-8"
      dir="rtl"
    >
      <PrintHeader
        company={company}
        title="كشف حساب الزبون"
        subtitle={`الفترة: ${period}`}
      />
      <div className="mb-5 flex justify-end" data-print-ignore>
        <button
          type="button"
          onClick={() => void printStatement()}
          className="btn-primary"
        >
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </button>
      </div>
      <header className="report-print-hide grid gap-5 border-b pb-5 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/assets/al-fajr-logo.png"
              alt="شعار الشركة"
              className="h-24 w-36 object-cover object-[center_45%]"
            />
            <h2 className="text-2xl font-black text-brand">
              {company?.company_name || "—"}
            </h2>
          </div>
          <p className="mt-2 text-sm text-stone-600">
            {company?.phones.join(" · ")}
          </p>
          <p className="text-sm text-stone-600">
            {[company?.address, company?.city, company?.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="sm:text-left">
          <h1 className="text-2xl font-black text-brand">كشف حساب الزبون</h1>
          <p className="mt-2 text-sm">الفترة: {period}</p>
          <p className="text-xs text-stone-500">
            سيتم تثبيت تاريخ الإنشاء عند فتح نافذة الطباعة.
          </p>
        </div>
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
        />
        <Summary
          label="إجمالي الطلبات"
          value={statement.summary.orders_total}
        />
        <Summary
          label="إجمالي الدفعات"
          value={statement.summary.payments_total}
        />
        <Summary
          label="رصيد آخر المدة"
          value={statement.summary.closing_balance}
        />
      </section>
      {statement.entries.length === 0 ? (
        <p className="py-12 text-center text-stone-500">
          لا توجد حركات ضمن الفترة المحددة.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="statement-table w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-stone-100">
                {[
                  "التاريخ",
                  "البيان",
                  "رقم الطلب",
                  "مدين",
                  "دائن",
                  "الرصيد",
                ].map((label) => (
                  <th key={label} className="border p-3 text-right">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statement.entries.map((entry) => (
                <tr
                  key={`${entry.type}-${entry.payment_id ?? entry.order_id}-${entry.date}`}
                >
                  <td className="whitespace-nowrap border p-3">
                    {formatOrderDate(entry.date)}
                  </td>
                  <td className="border p-3">
                    {entry.type === "Payment"
                      ? `${entry.payment_method === "Cash" ? "دفعة نقدية" : "دفعة شيك"}${entry.check_number ? ` - رقم ${entry.check_number}` : ""}`
                      : entry.order_type === "Retail"
                        ? "طلب تجزئة"
                        : entry.order_type === "Wholesale"
                          ? "طلب جملة"
                          : entry.order_type === "StoreSale"
                            ? "بيع من المحل"
                            : entry.description}
                  </td>
                  <td className="border p-3">#{entry.order_id}</td>
                  <td className="border p-3">{formatMoney(entry.debit)}</td>
                  <td className="border p-3">{formatMoney(entry.credit)}</td>
                  <td className="border p-3 font-black">
                    {formatMoney(entry.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <span className="text-xs font-bold text-stone-500">{label}</span>
      <b className="mt-2 block text-lg text-brand">{formatMoney(value)}</b>
    </div>
  );
}
