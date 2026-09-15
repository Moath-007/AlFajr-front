import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, HandCoins, RefreshCw, Search } from "lucide-react";
import {
  ordersService,
  representativesService,
  type OrderListItemResponseDto,
  type OrdersPaginationDto,
  type OrderType,
  type PaymentStatus,
  type RepresentativeResponseDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { PaymentStatusBadge } from "@/components/rep/RepOrderUi";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";
import CustomerSettlementModal from "@/components/ui/CustomerSettlementModal";
import { PaymentModal } from "@/components/rep/RepReceivablesPage";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import { orderTypeLabel, typeOptions } from "./adminOrderOptions";
const empty: OrdersPaginationDto = {
  page: 1,
  limit: 15,
  total: 0,
  total_pages: 0,
};
export default function AdminReceivablesPage() {
  const [orders, setOrders] = useState<OrderListItemResponseDto[]>([]);
  const [pagination, setPagination] = useState(empty);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [payment, setPayment] = useState("");
  const [rep, setRep] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [settlement, setSettlement] = useState<number | null>(null);
  const selectedOrder = orders.find((order) => order.id === settlement) ?? null;
  const [retry, setRetry] = useState(0);
  const [repWarning, setRepWarning] = useState<string[]>([]);
  const [contractWarning, setContractWarning] = useState("");
  const [repRetry, setRepRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    representativesService
      .list(undefined, c.signal)
      .then((r) => {
        setReps(r.representatives);
        setRepWarning([]);
      })
      .catch((error) => {
        if (!c.signal.aborted)
          setRepWarning(apiMessages(error, "تعذر تحميل قائمة المناديب."));
      });
    return () => c.abort();
  }, [repRetry]);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      return ordersService
        .listReceivables(
          {
            page,
            limit: 15,
            search: q || undefined,
            order_type: (type as OrderType) || undefined,
            payment_status: (payment as PaymentStatus) || undefined,
            representative_id: rep ? Number(rep) : undefined,
            date_from: from || undefined,
            date_to: to || undefined,
            sort_by: "created_at",
            sort_order: "desc",
          },
          signal,
        )
        .then((r) => {
          setOrders(r.orders);
          setPagination(r.pagination);
          setContractWarning(
            r.orders.some((order) => order.status === "Cancelled")
              ? "أعاد الخادم طلبًا ملغيًا ضمن التحصيلات. تم تعطيل التحصيل لهذا الطلب لأنه يخالف قاعدة العمل."
              : "",
          );
        })
        .catch((e) => {
          if (!signal?.aborted)
            setErrors(apiMessages(e, "تعذر تحميل التحصيلات."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [from, page, payment, q, rep, to, type],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const change = (s: (v: string) => void) => (v: string) => {
    s(v);
    setPage(1);
  };
  const clear = () => {
    setSearch("");
    setQ("");
    setType("");
    setPayment("");
    setRep("");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(search.trim());
  };
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">متابعة الأرصدة</p>
        <h1 className="mt-1 text-3xl font-black text-brand">التحصيلات</h1>
        <p className="mt-2 text-sm text-stone-500">
          الطلبات القابلة للتحصيل كما يعيدها النظام.
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
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                className="rep-control pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </span>
          </label>
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
            options={[
              { value: "", label: "غير المدفوع والمدفوع جزئيًا" },
              { value: "Unpaid", label: "غير مدفوع" },
              { value: "PartiallyPaid", label: "مدفوع جزئيًا" },
            ]}
          />
          <RepSelect
            label="المندوب"
            value={rep}
            onChange={change(setRep)}
            options={[
              { value: "", label: "كل المناديب" },
              ...reps.map((r) => ({ value: String(r.user_id), label: r.name })),
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
          <button className="min-h-11 rounded-xl bg-brand px-5 font-black text-white">
            بحث
          </button>
        </form>
        {(search || q || type || payment || rep || from || to) && (
          <button
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
            className="mt-2 inline-flex gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}
      {contractWarning && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800"
        >
          {contractWarning}
        </div>
      )}
      {loading ? (
        <Skeleton className="h-96" />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="h-8 w-8" />}
          title="لا توجد مبالغ مستحقة"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "الطلب",
                    "العميل",
                    "النوع",
                    "المندوب",
                    "الدفع",
                    "الإجمالي",
                    "المدفوع",
                    "المتبقي",
                    "التاريخ",
                    "",
                  ].map((x, i) => (
                    <th key={`${x}-${i}`} className="px-3 py-3 text-right">
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
                      <b>{o.customer.name}</b>
                      <small className="block">{o.customer.phone}</small>
                    </td>
                    <td className="px-3">{orderTypeLabel(o.order_type)}</td>
                    <td className="px-3">{o.representative?.name || "—"}</td>
                    <td className="px-3">
                      <PaymentStatusBadge status={o.payment_status} />
                    </td>
                    <td className="px-3">{formatMoney(o.total_amount)}</td>
                    <td className="px-3 text-emerald-700">
                      {formatMoney(o.paid_amount)}
                    </td>
                    <td className="px-3 text-lg font-black text-red-700">
                      {formatMoney(o.remaining_amount)}
                    </td>
                    <td className="px-3">{formatOrderDate(o.created_at)}</td>
                    <td className="px-3">
                      {o.status === "Cancelled" ? (
                        <span className="text-xs font-black text-red-700">
                          غير قابل للتحصيل
                        </span>
                      ) : (<div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelected(o.id)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-white"
                          aria-label={`تحصيل دفعة للطلب ${o.id}`}
                        >
                          <Eye className="h-4 w-4" /> إضافة دفعة
                        </button>
                        <button onClick={() => setSettlement(o.id)} className="min-h-10 rounded-lg border border-brand px-3 text-xs font-bold text-brand">تحصيل كامل الحساب</button></div>
                      )}
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
                  <PaymentStatusBadge status={o.payment_status} />
                </div>
                <p className="mt-1 text-xs text-stone-400">
                  {orderTypeLabel(o.order_type)} ·{" "}
                  {o.representative?.name || "بدون مندوب"} ·{" "}
                  {formatOrderDate(o.created_at)}
                </p>
                <strong className="mt-4 block text-xl text-red-700">
                  المتبقي: {formatMoney(o.remaining_amount)}
                </strong>
                <p className="text-xs text-stone-500">
                  الإجمالي {formatMoney(o.total_amount)} · المدفوع{" "}
                  {formatMoney(o.paid_amount)}
                </p>
                {o.status === "Cancelled" ? (
                  <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-black text-red-700">
                    طلب ملغي — غير قابل للتحصيل
                  </p>
                ) : (<div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => setSelected(o.id)}
                    className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
                  >
                    تحصيل دفعة
                  </button>
                  <button onClick={() => setSettlement(o.id)} className="min-h-11 w-full rounded-xl border border-brand font-black text-brand">تحصيل كامل الحساب</button></div>
                )}
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
          <span className="py-2">
            {page}/{pagination.total_pages}
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
      <PaymentModal orderId={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); setRetry((x) => x + 1); }} />
      <CustomerSettlementModal
        customer={selectedOrder ? { id: selectedOrder.customer.id, name: selectedOrder.customer.name, phone: selectedOrder.customer.phone } : null}
        onClose={() => setSettlement(null)}
        onChanged={(result) => {
          setSettlement(null);
          setContractWarning(`${result.message} — وُزعت الدفعة على ${result.allocations.length} طلب/طلبات.`);
          setRetry((x) => x + 1);
        }}
      />
    </div>
  );
}
