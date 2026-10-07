import { useEffect, useState } from "react";
import { RepDateInput } from "@/components/rep/RepFormControls";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";
import {
  ordersService,
  type ApiOrderStatus,
  type OrderResponseDto,
  type OrdersPaginationDto,
} from "@/api";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import { takeOrderDeletedMessage } from "./orderDeleteFeedback";
export default function InvoicesList({
  mode,
  onNavigate,
}: {
  mode: "admin" | "representative";
  onNavigate: (path: string) => void;
}) {
  const [rows, setRows] = useState<OrderResponseDto[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<OrdersPaginationDto>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [status, setStatus] = useState<ApiOrderStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [message] = useState(() => takeOrderDeletedMessage(mode));
  const path = mode === "admin" ? "/owner/orders" : "/rep/orders";
  useEffect(() => {
    if (search.trim() === submitted) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setSubmitted(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, submitted]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    ordersService
      .list(
        {
          page,
          limit: 20,
          search: submitted || undefined,
          status: status || undefined,
          date_from: from || undefined,
          date_to: to || undefined,
        },
        controller.signal,
      )
      .then((r) => {
        if (!controller.signal.aborted) {
          setRows(r.orders);
          setPagination(r.pagination);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل الفواتير").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, submitted, status, from, to, retry]);
  const filtered = Boolean(submitted || status || from || to);
  const reset = () => { setSearch(""); setSubmitted(""); setStatus(""); setFrom(""); setTo(""); setPage(1); };
  return (
    <div className="orders-page space-y-5 min-w-0" dir="rtl">
      <header className="rep-page-header">
        <h1 className="text-2xl font-black">جميع فواتير البيع</h1>
        <button
          className="btn-primary"
          onClick={() =>
            onNavigate(
              mode === "admin" ? "/owner/store-sale" : "/rep/orders/new",
            )
          }
        >
          فاتورة جديدة
        </button>
      </header>
      {message && <p role="status">{message}</p>}
      <form
        className="rep-section grid items-end gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmitted(search.trim());
        }}
      >
        <label className="min-w-0"><span className="rep-label">بحث عن فاتورة</span><input
          className="rep-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="رقم الفاتورة / الحساب / جهة التواصل"
          aria-label="بحث"
        /></label>
        <Select<ApiOrderStatus | ""> label="الحالة" value={status} options={[{value:"",label:"كل الحالات"},{value:"Pending",label:"قيد الانتظار"},{value:"Completed",label:"مكتمل"},{value:"Cancelled",label:"ملغي"}]} onChange={(value) => { setPage(1); setStatus(value); }} />
        <RepDateInput label="من تاريخ" value={from} max={to || undefined} onChange={(value) => { setPage(1); setFrom(value); }} />
        <RepDateInput label="إلى تاريخ" value={to} min={from || undefined} onChange={(value) => { setPage(1); setTo(value); }} />
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 sm:col-span-2 xl:col-span-4"><span className="text-xs text-stone-500">البحث يتحدّث تلقائياً أثناء الكتابة</span>{(filtered || search) && <button type="button" className="btn-ghost" onClick={reset}>مسح الفلاتر</button>}{!loading && !error && <span className="ms-auto text-sm text-stone-500" role="status">{pagination.total} فاتورة</span>}</div>
      </form>
      {error && (
        <p role="alert" className="rep-error">
          {error}
          <button
            className="btn-outline"
            onClick={() => setRetry((n) => n + 1)}
          >
            إعادة المحاولة
          </button>
        </p>
      )}
      {error ? null : loading ? (
        <div role="status" className="rep-section flex min-h-64 items-center justify-center gap-3 text-sm text-stone-500"><Loader2 aria-hidden className="h-5 w-5 animate-spin" />جاري تحميل الفواتير…</div>
      ) : (
        <div className="rep-section overflow-hidden">
          <table className="orders-table w-full table-fixed text-right">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                {[
                  "الفاتورة",
                  "الحساب / التواصل",
                  "المنشئ",
                  "الحالة",
                  "الإجمالي",
                  "التاريخ",
                  "",
                ].map((label, n) => (
                  <th className={`p-3 ${n === 1 ? "md:w-[28%]" : n === 6 ? "md:w-24" : ""}`} key={n}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} tabIndex={0} aria-label={`فتح فاتورة رقم ${row.id}`} onClick={(e) => { if (!(e.target as Element).closest("button,a,input,select")) onNavigate(`${path}/${row.id}`); }} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onNavigate(`${path}/${row.id}`); } }} className="cursor-pointer border-t border-stone-100 transition-colors hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold">
                  <td data-label="الفاتورة" className="p-3 font-black text-brand">#{row.id}</td>
                  <td data-label="الحساب / التواصل" className="p-3"><span className="line-clamp-2 font-bold" title={row.sale_account?.name ?? row.contact_text ?? undefined}>{row.sale_account?.name ?? row.contact_text ?? "يُحدد عند التأكيد"}</span>{row.sale_account && row.contact_text && <span className="mt-1 line-clamp-1 text-xs text-stone-500" title={row.contact_text}>{row.contact_text}</span>}</td>
                  <td data-label="المنشئ" className="p-3 text-xs text-stone-500"><span className="line-clamp-2" title={row.creator?.name}>{row.creator?.name ?? "طلب عام"}</span></td>
                  <td data-label="الحالة" className="p-3">
                    <OrderStatusBadge status={row.status} />
                  </td>
                  <td data-label="الإجمالي" className="p-3 font-black tabular-nums">{formatMoney(row.total_amount)}</td>
                  <td data-label="التاريخ" className="p-3 text-xs text-stone-500">{formatOrderDate(row.created_at)}</td>
                  <td>
                    <button
                      className="btn-ghost"
                      aria-label={`تفاصيل فاتورة ${row.id}`}
                      onClick={(e) => { e.stopPropagation(); onNavigate(`${path}/${row.id}`); }}
                    >
                      التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <EmptyState title={filtered ? "لا توجد نتائج مطابقة" : "لا توجد فواتير بعد"} description={filtered ? "جرّب تغيير البحث أو مسح الفلاتر." : "ستظهر فواتير البيع هنا."} action={filtered ? <button className="btn-outline" onClick={reset}>مسح الفلاتر</button> : undefined} />}
        </div>
      )}
      {!error && pagination.total > 0 && <nav aria-label="صفحات الفواتير" className="flex justify-center"><div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
        <button
          className="btn-ghost"
          disabled={page <= 1 || loading}
          onClick={() => setPage((n) => n - 1)}
        >
          السابق
        </button>
        <span aria-current="page" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold">
          {page} من {Math.max(1, pagination.total_pages)}
        </span>
        <button
          className="btn-ghost"
          disabled={page >= pagination.total_pages || loading}
          onClick={() => setPage((n) => n + 1)}
        >
          التالي
        </button>
      </div></nav>}
    </div>
  );
}
