import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
import {
  ordersService,
  representativesService,
  type ApiOrderStatus,
  type OrderListItemResponseDto,
  type OrdersPaginationDto,
  type OrderType,
  type PaymentStatus,
  type RepresentativeResponseDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/rep/RepOrderUi";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import {
  orderTypeLabel,
  paymentOptions,
  statusOptions,
  typeOptions,
} from "./adminOrderOptions";
const emptyPagination: OrdersPaginationDto = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
};
const defaultSort = "created_at:desc";
export default function AdminOrdersPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [orders, setOrders] = useState<OrderListItemResponseDto[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [payment, setPayment] = useState("");
  const [rep, setRep] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [repWarning, setRepWarning] = useState<string[]>([]);
  const [repRetry, setRepRetry] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    representativesService
      .list(undefined, c.signal)
      .then((r) => {
        setReps(r.representatives);
        setRepWarning([]);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setRepWarning(apiMessages(e, "تعذر تحميل قائمة المناديب."));
      });
    return () => c.abort();
  }, [repRetry]);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      const [sort_by, sort_order] = sort.split(":") as [
        "created_at" | "total_amount",
        "asc" | "desc",
      ];
      return ordersService
        .list(
          {
            page,
            limit: 20,
            search: submittedSearch || undefined,
            status: (status as ApiOrderStatus) || undefined,
            order_type: (type as OrderType) || undefined,
            payment_status: (payment as PaymentStatus) || undefined,
            representative_id: rep ? Number(rep) : undefined,
            date_from: from || undefined,
            date_to: to || undefined,
            sort_by,
            sort_order,
          },
          signal,
        )
        .then((r) => {
          setOrders(r.orders);
          setPagination(r.pagination);
        })
        .catch((e) => {
          if (!signal?.aborted)
            setErrors(apiMessages(e, "تعذر تحميل الطلبات."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [from, page, payment, rep, sort, status, submittedSearch, to, type],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const change = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  };
  const active = Boolean(
    search ||
    submittedSearch ||
    status ||
    type ||
    payment ||
    rep ||
    from ||
    to ||
    sort !== defaultSort,
  );
  const clear = () => {
    setSearch("");
    setSubmittedSearch("");
    setStatus("");
    setType("");
    setPayment("");
    setRep("");
    setFrom("");
    setTo("");
    setSort(defaultSort);
    setPage(1);
  };
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">إدارة العمليات</p>
        <h1 className="mt-1 text-3xl font-black text-brand">الطلبات</h1>
        <p className="mt-2 text-sm text-stone-500">
          متابعة طلبات الأونلاين والجملة وبيع المحل.
        </p>
      </header>
      <section className="rounded-2xl border bg-white p-4">
        <form
          onSubmit={submit}
          className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="rep-label">البحث</span>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="rep-control pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="رقم الطلب أو العميل"
              />
            </span>
          </label>
          <RepSelect
            label="حالة الطلب"
            value={status}
            onChange={change(setStatus)}
            options={statusOptions}
          />
          <RepSelect
            label="نوع الطلب"
            value={type}
            onChange={change(setType)}
            options={typeOptions}
          />
          <RepSelect
            label="حالة الدفع"
            value={payment}
            onChange={change(setPayment)}
            options={paymentOptions}
          />
          <RepSelect
            label="المندوب"
            value={rep}
            onChange={change(setRep)}
            options={[
              { value: "", label: "كل المناديب" },
              ...reps.map((x) => ({ value: String(x.user_id), label: x.name })),
            ]}
          />
          <RepDateInput
            label="من تاريخ"
            value={from}
            onChange={change(setFrom)}
            max={to || undefined}
          />
          <RepDateInput
            label="إلى تاريخ"
            value={to}
            onChange={change(setTo)}
            min={from || undefined}
          />
          <RepSelect
            label="الترتيب"
            value={sort}
            onChange={change(setSort)}
            options={[
              { value: defaultSort, label: "الأحدث" },
              { value: "created_at:asc", label: "الأقدم" },
              { value: "total_amount:desc", label: "الأعلى قيمة" },
              { value: "total_amount:asc", label: "الأقل قيمة" },
            ]}
          />
          <button className="min-h-11 rounded-xl bg-brand px-5 font-black text-white">
            بحث
          </button>
        </form>
        {active && (
          <button
            type="button"
            onClick={clear}
            className="mt-3 text-xs font-black text-gold-dark"
          >
            مسح الفلاتر
          </button>
        )}
        {repWarning.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800">
            <span>{repWarning.join("، ")}</span>
            <button
              type="button"
              onClick={() => setRepRetry((value) => value + 1)}
              className="inline-flex items-center gap-1 underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
            </button>
          </div>
        )}
      </section>
      {errors.length > 0 && (
        <div className="rep-error text-center">
          <p>{errors.join("، ")}</p>
          <button
            onClick={() => setRetry((x) => x + 1)}
            className="mt-2 inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <Skeleton className="h-96" />
      ) : orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات مطابقة" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "الطلب",
                    "العميل",
                    "المندوب",
                    "النوع",
                    "الحالة",
                    "الدفع",
                    "الإجمالي",
                    "المدفوع",
                    "المتبقي",
                    "التاريخ",
                    "",
                  ].map((x, i) => (
                    <th
                      key={`${x}-${i}`}
                      className="whitespace-nowrap px-3 py-3 text-right text-stone-500"
                    >
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-4 font-black text-brand">#{o.id}</td>
                    <td className="px-3">
                      <b className="block">{o.customer.name}</b>
                      <small>{o.customer.phone}</small>
                    </td>
                    <td className="px-3">{o.representative?.name || "—"}</td>
                    <td className="px-3">{orderTypeLabel(o.order_type)}</td>
                    <td className="px-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-3">
                      <PaymentStatusBadge status={o.payment_status} />
                    </td>
                    <td className="px-3">{formatMoney(o.total_amount)}</td>
                    <td className="px-3 text-emerald-700">
                      {formatMoney(o.paid_amount)}
                    </td>
                    <td className="px-3 font-black text-red-700">
                      {formatMoney(o.remaining_amount)}
                    </td>
                    <td className="whitespace-nowrap px-3">
                      {formatOrderDate(o.created_at)}
                    </td>
                    <td className="px-3">
                      <button
                        onClick={() => onNavigate(`/owner/orders/${o.id}`)}
                        aria-label="عرض الطلب"
                        className="rounded-lg bg-brand-50 p-2 text-brand"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {orders.map((o) => (
              <article key={o.id} className="rounded-2xl border bg-white p-4">
                <div className="flex justify-between">
                  <b className="text-brand">
                    #{o.id} · {o.customer.name}
                  </b>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="mt-1 text-xs text-stone-400">
                  {orderTypeLabel(o.order_type)} ·{" "}
                  {o.representative?.name || "بدون مندوب"} ·{" "}
                  {formatOrderDate(o.created_at)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 border-y py-3 text-center text-xs">
                  <Amount label="الإجمالي" value={o.total_amount} />
                  <Amount label="المدفوع" value={o.paid_amount} />
                  <Amount label="المتبقي" value={o.remaining_amount} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <PaymentStatusBadge status={o.payment_status} />
                  <button
                    onClick={() => onNavigate(`/owner/orders/${o.id}`)}
                    className="font-black text-gold-dark"
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {pagination.total_pages > 1 && (
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
      )}
    </div>
  );
}
function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-stone-400">{label}</span>
      <b className="mt-1 block text-brand">{formatMoney(value)}</b>
    </div>
  );
}
