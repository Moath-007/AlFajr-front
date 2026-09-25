import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Pencil, RefreshCw } from "lucide-react";
import {
  ordersService,
  type ApiOrderStatus,
  type OrderResponseDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import { orderTypeLabel } from "./adminOrderOptions";
import OrderReceipt from "@/components/ui/OrderReceipt";
import { useCustomerCurrentDebt } from "@/components/orders/useCustomerCurrentDebt";
import CreateReturnModal from "@/components/finance/CreateReturnModal";
export default function AdminOrderDetailsPage({
  orderId,
  onNavigate,
}: {
  orderId: number;
  onNavigate: (p: string) => void;
}) {
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [action, setAction] = useState<Extract<
    ApiOrderStatus,
    "Completed" | "Cancelled"
  > | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retry, setRetry] = useState(0);
  const [success, setSuccess] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const customerDebt = useCustomerCurrentDebt(order?.customer.phone);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      return ordersService
        .getById(orderId, signal)
        .then((r) => setOrder(r.order))
        .catch((e) => {
          if (!signal?.aborted)
            setErrors(apiMessages(e, "تعذر تحميل تفاصيل الطلب."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [orderId],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const changeStatus = async () => {
    if (!action) return;
    setSubmitting(true);
    setErrors([]);
    try {
      const response = action === "Cancelled"
        ? await ordersService.cancel(orderId)
        : await ordersService.updateStatus(orderId, { status: action });
      setAction(null);
      setSuccess(response.message);
      await load();
    } catch (e) {
      setAction(null);
      setErrors(apiMessages(e, "تعذر تغيير حالة الطلب."));
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <Skeleton className="h-[600px]" />;
  if (!order)
    return (
      <div className="rep-error text-center">
        <p>{errors.join("، ") || "الطلب غير موجود."}</p>
        <button
          onClick={() => setRetry((x) => x + 1)}
          className="mt-3 inline-flex gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  const summary = (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="font-black text-brand">الملخص المالي</h2>
      <div className="mt-4 space-y-3">
        <Summary label="خصم الطلب" value={order.order_discount} />
        <Summary label="الإجمالي" value={order.total_amount} />
      </div>
    </section>
  );
  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigate("/owner/orders")}
        className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للطلبات
      </button>
      {success && (
        <div
          className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800"
          role="status"
        >
          {success}
        </div>
      )}
      {errors.length > 0 && (
        <div className="rep-error">{errors.join("، ")}</div>
      )}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold text-gold-dark">
            {orderTypeLabel(order.order_type)}
          </p>
          <h1 className="mt-1 text-3xl font-black text-brand">
            طلب #{order.id}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {formatOrderDate(order.created_at)}
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500"><span>حالة الطلب:</span><OrderStatusBadge status={order.status} /></div>
          <div className="flex flex-wrap gap-2"><OrderReceipt order={order} customerCurrentDebt={customerDebt.debt} customerDebtLoading={customerDebt.loading} customerDebtFailed={customerDebt.failed} />
          {order.status === "Pending" && (
            <>
              {order.order_type !== "Retail" && (
                <button
                  onClick={() => onNavigate(`/owner/orders/${order.id}/edit`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-black text-white"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل
                </button>
              )}
              <button
                onClick={() => setAction("Completed")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white"
              >
                إكمال الطلب
              </button>
              <button
                onClick={() => setAction("Cancelled")}
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700"
              >
                إلغاء الطلب
              </button>
            </>
          )}
          {order.status === "Completed" && order.order_type !== "Retail" && <button onClick={() => onNavigate(`/owner/orders/${order.id}/edit`)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-black text-white"><Pencil className="h-4 w-4"/> تعديل الطلب المكتمل</button>}
          {order.status === "Completed" && <button onClick={() => setReturnOpen(true)} className="btn-outline">إنشاء مردود مبيعات</button>}
          {order.status === "Completed" && <button onClick={() => setAction("Cancelled")} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700">إلغاء الطلب</button>}</div>
        </div>
      </header>
      <div className="lg:hidden">{summary}</div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-black text-brand">بيانات العميل</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="الاسم" value={order.customer.name} />
              <Info label="الهاتف" value={order.customer.phone} />
              <Info label="البريد" value={order.customer.email || "—"} />
              <Info label="العنوان" value={order.delivery_address || "—"} />
              {order.representative && (
                <Info
                  label="المندوب"
                  value={`${order.representative.name} — ${order.representative.email}`}
                />
              )}{" "}
              {order.notes && <Info label="ملاحظات" value={order.notes} />}
            </dl>
            <button className="btn-outline mt-4" onClick={() => onNavigate(`/owner/customers/${order.customer.id}`)}>فتح حساب الزبون</button>
          </section>
          <section className="overflow-hidden rounded-2xl border bg-white">
            <h2 className="p-5 font-black text-brand">عناصر الطلب</h2>
            <div className="space-y-3 p-4 sm:hidden">
              {order.items.map((i) => (
                <article key={i.id} className="rounded-xl bg-stone-50 p-4">
                  <div className="flex justify-between gap-2">
                    <b>{i.variant.product.name}</b>
                    <b className="text-gold-dark">
                      {formatMoney(i.line_total)}
                    </b>
                  </div>
                  <p className="text-xs text-stone-500">
                    {i.variant.product.code} · {i.variant.size} ·{" "}
                    {i.variant.color.name}
                  </p>
                  <p className="mt-2 text-xs">
                    الكمية: {i.quantity} · الوحدة الفعلية: {formatMoney(i.unit_price)}
                    {i.is_bonus ? " · بونص (القيمة صفر)" : Number(i.base_unit_price) !== Number(i.unit_price) ? ` · الأساسي: ${formatMoney(i.base_unit_price)}` : ` · الخصم: ${formatMoney(i.product_discount)}`}
                  </p>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {[
                      "المنتج",
                      "الخيار",
                      "الكمية",
                      "سعر الوحدة",
                      "الخصم",
                      "الإجمالي",
                    ].map((x) => (
                      <th key={x} className="px-4 py-3 text-right">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-3">
                        <b>{i.variant.product.name}</b>
                        <small className="block">
                          {i.variant.product.code}
                        </small>
                      </td>
                      <td className="px-4">
                        {i.variant.size} — {i.variant.color.name}
                      </td>
                      <td className="px-4">{i.quantity}</td>
                      <td className="px-4">{i.is_bonus ? <span className="rounded-full bg-gold/20 px-2 py-1 text-xs font-black">بونص · 0 ₪</span> : <>{formatMoney(i.unit_price)}{Number(i.base_unit_price) !== Number(i.unit_price) && <small className="block text-stone-400">الأساسي {formatMoney(i.base_unit_price)}</small>}</>}</td>
                      <td className="px-4">
                        {formatMoney(i.product_discount)}
                      </td>
                      <td className="px-4 font-black text-gold-dark">
                        {formatMoney(i.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="hidden lg:block lg:sticky lg:top-5 lg:h-fit">
          {summary}
        </aside>
      </div>
      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={() => void changeStatus()}
        loading={submitting}
        severity={action === "Cancelled" ? "destructive" : "normal"}
        title={action === "Cancelled" ? "إلغاء الطلب" : "إكمال الطلب"}
        message={
          action === "Cancelled"
            ? "سيتم إلغاء الطلب وعكس أثره على المخزون والحساب. سندات القبض والصرف المستقلة ستبقى كما هي."
            : "هل أنت متأكد من إكمال الطلب؟"
        }
        confirmLabel={action === "Cancelled" ? "إلغاء الطلب" : "إكمال الطلب"}
      />
      <CreateReturnModal open={returnOpen} sourceType="SalesReturn" sourceId={order.id} items={order.items.map((item) => ({ productVariantId: Number(item.variant.id), quantity: item.quantity, label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}` }))} onClose={() => setReturnOpen(false)} onSaved={(message) => { setReturnOpen(false); setSuccess(message); setRetry((value) => value + 1); }}/>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <dt className="text-xs text-stone-400">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}
function Summary({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between border-b pb-3">
      <span className="font-bold text-stone-500">{label}</span>
      <b className={strong ? "text-lg text-red-700" : "text-brand"}>
        {formatMoney(value)}
      </b>
    </div>
  );
}
