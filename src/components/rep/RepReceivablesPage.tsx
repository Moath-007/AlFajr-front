import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, HandCoins, Search } from "lucide-react";
import {
  ordersService,
  type OrderListItemResponseDto,
  type OrderPaymentInfoDataDto,
  type OrdersPaginationDto,
  type PaymentMethod,
} from "@/api";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { OrderStatusBadge, PaymentStatusBadge } from "./RepOrderUi";
import { apiMessages, formatMoney, formatOrderDate } from "./repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CustomerSettlementModal from "@/components/ui/CustomerSettlementModal";
import Select from "@/components/ui/Select";

const emptyPagination: OrdersPaginationDto = {
  page: 1,
  limit: 10,
  total: 0,
  total_pages: 0,
};
export default function RepReceivablesPage() {
  const [orders, setOrders] = useState<OrderListItemResponseDto[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settlementId, setSettlementId] = useState<number | null>(null);
  const selectedOrder = orders.find((order) => order.id === settlementId) ?? null;
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      return ordersService
        .listReceivables(
          {
            page,
            limit: 10,
            search: submittedSearch || undefined,
            sort_by: "created_at",
            sort_order: "desc",
          },
          signal,
        )
        .then((response) => {
          setOrders(response.orders);
          setPagination(response.pagination);
        })
        .catch((error) => {
          if (!signal?.aborted)
            setErrors(apiMessages(error, "تعذر تحميل التحصيلات."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [page, submittedSearch],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  };
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-black text-gold-dark">متابعة الأرصدة</p>
        <h1 className="mt-1 text-3xl font-black text-brand">التحصيلات</h1>
        <p className="mt-2 text-sm text-stone-500">
          معلومات تحصيل محدودة للطلبات التي ما زال عليها مبلغ متبقٍ.
        </p>
      </header>
      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row"
      >
        <label className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            className="input pr-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="رقم الطلب أو اسم العميل أو الهاتف"
          />
        </label>
        <button className="min-h-11 rounded-xl bg-brand px-5 text-sm font-black text-white">
          بحث
        </button>
      </form>
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center font-bold text-red-800">
          {errors.join("، ")}
        </div>
      )}
      {loading ? (
        <Skeleton className="h-96" />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border bg-white">
          <EmptyState
            icon={<HandCoins className="h-9 w-9" />}
            title="لا توجد مبالغ مستحقة"
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {[
                      "الطلب",
                      "العميل",
                      "المندوب",
                      "الحالة",
                      "الدفع",
                      "الإجمالي",
                      "المدفوع",
                      "المتبقي",
                      "",
                    ].map((label, i) => (
                      <th
                        key={`${label}-${i}`}
                        className="px-4 py-3 text-right text-stone-500"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-4 font-black text-brand">
                        #{order.id}
                      </td>
                      <td className="px-4">
                        <strong className="block">{order.customer.name}</strong>
                        <small dir="ltr">{order.customer.phone}</small>
                      </td>
                      <td className="px-4">
                        {order.representative?.name || "—"}
                      </td>
                      <td className="px-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>
                      <td className="px-4">
                        {formatMoney(order.total_amount)}
                      </td>
                      <td className="px-4 text-emerald-700">
                        {formatMoney(order.paid_amount)}
                      </td>
                      <td className="px-4 font-black text-red-700">
                        {formatMoney(order.remaining_amount)}
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-2 whitespace-nowrap"><button
                          onClick={() => setSelectedId(order.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white"
                        >
                          <Eye className="h-4 w-4" /> إضافة دفعة
                        </button>
                        <button onClick={() => setSettlementId(order.id)} className="min-h-10 rounded-lg border border-brand px-3 text-xs font-bold text-brand">تحصيل كامل الحساب</button></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-brand">#{order.id}</strong>
                  <PaymentStatusBadge status={order.payment_status} />
                </div>
                <h2 className="mt-3 font-black text-stone-800">
                  {order.customer.name}
                </h2>
                <p className="text-xs text-stone-400">
                  {formatOrderDate(order.created_at)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-y py-3 text-center text-xs">
                  <Box
                    label="الإجمالي"
                    value={formatMoney(order.total_amount)}
                  />
                  <Box label="المدفوع" value={formatMoney(order.paid_amount)} />
                  <Box
                    label="المتبقي"
                    value={formatMoney(order.remaining_amount)}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2"><button
                  onClick={() => setSelectedId(order.id)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-black text-white"
                >
                  <Eye className="h-4 w-4" /> إضافة دفعة للطلب
                </button>
                <button onClick={() => setSettlementId(order.id)} className="min-h-11 w-full rounded-xl border border-brand font-black text-brand">تحصيل كامل الحساب</button></div>
              </article>
            ))}
          </div>
        </>
      )}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-outline"
          >
            السابق
          </button>
          <span className="py-2 text-sm font-bold">
            {page} / {pagination.total_pages}
          </span>
          <button
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
            className="btn-outline"
          >
            التالي
          </button>
        </div>
      )}
      <PaymentModal orderId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => { setSelectedId(null); void load(); }} />
      <CustomerSettlementModal
        customer={selectedOrder ? { id: selectedOrder.customer.id, name: selectedOrder.customer.name, phone: selectedOrder.customer.phone } : null}
        onClose={() => setSettlementId(null)}
        onChanged={(result) => {
          setSettlementId(null);
          setErrors([`${result.message} — وُزعت الدفعة على ${result.allocations.length} طلب/طلبات.`]);
          void load();
        }}
      />
    </div>
  );
}

export function PaymentModal({
  orderId,
  onClose,
  onChanged,
}: {
  orderId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [info, setInfo] = useState<OrderPaymentInfoDataDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [checkNumber, setCheckNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmPayment, setConfirmPayment] = useState(false);
  const refresh = useCallback(async () => {
    if (orderId === null) return;
    setLoading(true);
    setErrors([]);
    try {
      setInfo((await ordersService.getPaymentInfo(orderId)).order);
    } catch (error) {
      setErrors(apiMessages(error, "تعذر تحميل معلومات التحصيل."));
    } finally {
      setLoading(false);
    }
  }, [orderId]);
  useEffect(() => {
    setInfo(null);
    setAmount("");
    setCheckNumber("");
    setNotes("");
    if (orderId !== null) void refresh();
  }, [orderId, refresh]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (orderId === null) return;
    setErrors([]);
    if (!amount || Number(amount) <= 0) {
      setErrors(["يجب أن تكون قيمة الدفعة أكبر من صفر."]);
      return;
    }
    if (method === "Check" && !checkNumber.trim()) {
      setErrors(["رقم الشيك مطلوب عند اختيار الدفع بالشيك."]);
      return;
    }
    setConfirmPayment(true);
  };

  const addPayment = async () => {
    if (orderId === null) return;
    setSubmitting(true);
    setErrors([]);
    try {
      await ordersService.addPayment(orderId, {
        amount: Number(amount),
        payment_method: method,
        check_number: method === "Check" ? checkNumber.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      setConfirmPayment(false);
      await refresh();
      onChanged();
    } catch (error) {
      setConfirmPayment(false);
      setErrors(apiMessages(error, "تعذر إضافة الدفعة."));
      window.requestAnimationFrame(() => {
        const errorRegion = document.getElementById("payment-modal-errors");
        errorRegion?.focus();
        errorRegion?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <Modal
        open={orderId !== null}
        onClose={onClose}
        title={`تحصيل الطلب #${orderId ?? ""}`}
        size="lg"
      >
        {loading ? (
          <Skeleton className="h-80" />
        ) : (
          <div className="space-y-5">
            {errors.length > 0 && (
              <div id="payment-modal-errors" tabIndex={-1} role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800 outline-none">
                {errors.join("، ")}
              </div>
            )}
            {info && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Box
                    label="الإجمالي"
                    value={formatMoney(info.total_amount)}
                  />
                  <Box label="المدفوع" value={formatMoney(info.paid_amount)} />
                  <Box
                    label="المتبقي"
                    value={formatMoney(info.remaining_amount)}
                  />
                </div>
                <div>
                  <h3 className="font-black text-brand">سجل الدفعات</h3>
                  {info.payments.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">
                      لا توجد دفعات.
                    </p>
                  ) : (
                    <div className="mt-2 max-h-40 divide-y overflow-auto">
                      {info.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex justify-between py-2 text-sm"
                        >
                          <span>
                            {payment.payment_method === "Cash"
                              ? "نقدًا"
                              : `شيك ${payment.check_number || ""}`}
                          </span>
                          <strong>{formatMoney(payment.amount)}</strong>
                          <small>{formatOrderDate(payment.paid_at)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <form
                  onSubmit={submit}
                  className="grid gap-3 border-t pt-4 sm:grid-cols-2"
                >
                  <Field
                    label="المبلغ *"
                    value={amount}
                    onChange={setAmount}
                    type="number"
                  />
                  <Select
                    label="طريقة الدفع"
                    value={method}
                    options={[
                      { value: "Cash", label: "نقدًا" },
                      { value: "Check", label: "شيك" },
                    ]}
                    onChange={(value) => {
                      setMethod(value);
                      setCheckNumber("");
                    }}
                  />
                  {method === "Check" && (
                    <Field
                      label="رقم الشيك *"
                      value={checkNumber}
                      onChange={setCheckNumber}
                    />
                  )}
                  <Field label="ملاحظات" value={notes} onChange={setNotes} />
                  <button
                    disabled={submitting || !amount || Number(amount) <= 0}
                    className="rounded-xl bg-brand py-3 font-black text-white disabled:opacity-50 sm:col-span-2"
                  >
                    {submitting ? "جاري الإضافة…" : "إضافة الدفعة"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmPayment}
        onClose={() => setConfirmPayment(false)}
        onConfirm={() => void addPayment()}
        loading={submitting}
        severity="normal"
        title="تأكيد إضافة الدفعة"
        message={`هل أنت متأكد أنك تريد إضافة دفعة بقيمة ${formatMoney(amount || "0")}؟`}
        confirmLabel="إضافة الدفعة"
        details={
          info ? (
            <p>
              الطلب #{info.id} — المتبقي حاليًا:{" "}
              <strong>{formatMoney(info.remaining_amount)}</strong>
            </p>
          ) : undefined
        }
      />
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="rep-label">{label}</span>
      <input
        className="rep-control"
        type={type}
        min={type === "number" ? 0.01 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <small className="text-stone-400">{label}</small>
      <strong className="mt-1 block text-brand">{value}</strong>
    </div>
  );
}
