import { useEffect, useState } from "react";
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
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
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
        className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSubmitted(search.trim());
        }}
      >
        <input
          className="rep-control"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="رقم الفاتورة / الحساب / جهة التواصل"
          aria-label="بحث"
        />
        <select
          className="rep-control"
          value={status}
          onChange={(e) => {
            setPage(1);
            const value = e.target.value;
            setStatus(
              value === "Pending" ||
                value === "Completed" ||
                value === "Cancelled"
                ? value
                : "",
            );
          }}
        >
          <option value="">كل الحالات</option>
          <option value="Pending">معلق</option>
          <option value="Completed">مكتمل</option>
          <option value="Cancelled">ملغى</option>
        </select>
        <label>
          من
          <input
            className="rep-control"
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          إلى
          <input
            className="rep-control"
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </label>
        <button className="btn-outline">بحث</button>
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
      {loading ? (
        <p>جاري التحميل…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[700px] text-right">
            <thead>
              <tr>
                {[
                  "الفاتورة",
                  "الحساب",
                  "المرجع / التواصل",
                  "المنشئ",
                  "الحالة",
                  "الإجمالي",
                  "التاريخ",
                  "",
                ].map((label, n) => (
                  <th className="p-3" key={n}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">#{row.id}</td>
                  <td>{row.sale_account?.name ?? "يُحدد عند التأكيد"}</td>
                  <td>{row.sale_account?.name ?? row.contact_text ?? "—"}</td>
                  <td>{row.creator?.name ?? "طلب عام"}</td>
                  <td>
                    <OrderStatusBadge status={row.status} />
                  </td>
                  <td>{formatMoney(row.total_amount)}</td>
                  <td>{formatOrderDate(row.created_at)}</td>
                  <td>
                    <button
                      className="btn-outline"
                      onClick={() => onNavigate(`${path}/${row.id}`)}
                    >
                      التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-5">لا توجد فواتير مطابقة.</p>}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          className="btn-outline"
          disabled={page <= 1 || loading}
          onClick={() => setPage((n) => n - 1)}
        >
          السابق
        </button>
        <span>
          {page} / {Math.max(1, pagination.total_pages)} — {pagination.total}{" "}
          فاتورة
        </span>
        <button
          className="btn-outline"
          disabled={page >= pagination.total_pages || loading}
          onClick={() => setPage((n) => n + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
