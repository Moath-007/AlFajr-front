import { useEffect, useRef, useState } from "react";
import { ArrowRight, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { ordersService, type OrderResponseDto } from "@/api";
import { OrderStatusBadge } from "./RepOrderUi";
import { apiMessages, formatMoney, formatOrderDate } from "./repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";
import OrderReceipt from "@/components/ui/OrderReceipt";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useCustomerCurrentDebt } from "@/components/orders/useCustomerCurrentDebt";
import { useAuth } from "@/auth";
import CreateReturnModal from "@/components/finance/CreateReturnModal";
import { orderSaleAccountLabel, orderSourceLabel } from "@/components/orders/orderDisplay";
import { canEditOrder } from "@/components/orders/orderEditPermission";
import { rememberOrderDeleted } from "@/components/orders/orderDeleteFeedback";
export default function RepOrderDetailsPage({
  orderId,
  onNavigate,
}: {
  orderId: number;
  onNavigate: (path: string) => void;
}) {
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteLock = useRef(false);
  const [retry, setRetry] = useState(0);
  const customerDebt = useCustomerCurrentDebt(order?.customer.phone, order?.order_type === 'Wholesale');
  const deletePermanent = async () => {
    if (deleteLock.current) return;
    deleteLock.current = true;
    setDeleting(true);
    setErrors([]);
    try {
      const response = await ordersService.deletePermanent(orderId);
      rememberOrderDeleted("representative", response.message);
      onNavigate("/rep/orders");
    } catch (reason) {
      setDeleteOpen(false);
      setErrors(apiMessages(reason, "تعذر حذف الطلب نهائيًا."));
    } finally {
      setDeleting(false);
      deleteLock.current = false;
    }
  };
  useEffect(() => {
    const c = new AbortController();
    setOrder(null);
    setErrors([]);
    setLoading(true);
    ordersService
      .getById(orderId, c.signal)
      .then((r) => setOrder(r.order))
      .catch((e) => {
        if (!c.signal.aborted)
          setErrors(apiMessages(e, "تعذر تحميل تفاصيل الطلب."));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [orderId, retry]);
  if (loading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-28" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!order)
    return (
      <div
        className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center font-bold text-red-800"
        role="alert"
      >
        <p>{errors.join("، ") || "الطلب غير موجود."}</p>
        <button type="button" onClick={() => { setErrors([]); setLoading(true); setRetry((value) => value + 1); }} className="mt-3 inline-flex items-center gap-2 underline">
          <RefreshCw className="h-4 w-4" /> إعادة المحاولة
        </button>
      </div>
    );
  const summary = (
    <section className="h-fit rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="font-black text-brand">ملخص الطلب</h2>
      <div className="mt-5 space-y-3">
        <Summary label="خصم الطلب" value={order.order_discount} />
        <Summary label="الإجمالي" value={order.total_amount} />
      </div>
    </section>
  );
  return (
    <div className="space-y-6">
      <button
        onClick={() => onNavigate("/rep/orders")}
        className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"
      >
        <ArrowRight className="h-4 w-4" /> العودة إلى الطلبات
      </button>
      {errors.length > 0 && <div className="rep-error" role="alert">{errors.join("، ")}</div>}
      <header className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-stone-400">المصدر: {orderSourceLabel(order.order_type)}</p>
          <h1 className="mt-1 text-3xl font-black text-brand">
            طلب #{order.id}
          </h1>
          <p className="mt-2 text-sm text-stone-500">تاريخ الإنشاء: {formatOrderDate(order.created_at)}</p>
          <p className="mt-1 text-sm text-stone-600">حساب الفاتورة: <strong>{orderSaleAccountLabel(order)}</strong></p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-stone-500"><span>حالة الطلب:</span><OrderStatusBadge status={order.status} /></div>
          <div className="flex flex-wrap items-center gap-2"><OrderReceipt order={order} customerCurrentDebt={customerDebt.debt} customerDebtLoading={customerDebt.loading} customerDebtFailed={customerDebt.failed} />
          {canEditOrder(order, "Representative") && (
            <button
              onClick={() => onNavigate(`/rep/orders/${order.id}/edit`)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white"
            >
              <Pencil className="h-4 w-4" /> تعديل الطلب
            </button>
          )}
          {order.status !== "Cancelled" && order.representative?.id === user?.id && <button onClick={() => setCancelOpen(true)} className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-700">إلغاء الطلب</button>}
          {order.status === "Completed" && order.representative?.id === user?.id && <button onClick={() => setReturnOpen(true)} className="btn-outline">إنشاء مردود مبيعات</button>}
          {order.order_type === "Wholesale" && <button type="button" onClick={() => setDeleteOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-black text-red-800"><Trash2 className="h-4 w-4" /> حذف نهائي</button>}
          </div>
        </div>
      </header>
      <div className="lg:hidden">{summary}</div>
      <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-brand">معلومات العميل</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="الاسم" value={order.customer.name} />
              <Info label="الهاتف" value={order.customer.phone} />
              <Info label="البريد" value={order.customer.email || "—"} />
              <Info label="العنوان" value={order.delivery_address || "—"} />
              {order.representative && <Info label="المندوب" value={order.representative.name} />}
              {order.notes && <Info label="ملاحظات" value={order.notes} />}
            </dl>
            <button className="btn-outline mt-4" onClick={() => onNavigate(`/rep/customers/${order.customer.id}`)}>فتح حساب الزبون</button>
          </section>
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <h2 className="p-5 text-lg font-black text-brand">عناصر الطلب</h2>
            <div className="space-y-3 px-4 pb-4 sm:hidden">
              {order.items.map((i) => (
                <article
                  key={i.id}
                  className="rounded-xl border bg-stone-50 p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <strong className="block text-brand">
                        {i.variant.product.name}
                      </strong>
                      <small className="text-stone-400">
                        {i.variant.product.code} · {i.variant.size} —{" "}
                        {i.variant.color.name}
                      </small>
                    </div>
                    <strong className="text-gold-dark">
                      {formatMoney(i.line_total)}
                    </strong>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                    <Mini label="الكمية" value={String(i.quantity)} />
                    <Mini
                      label="سعر الوحدة"
                      value={i.is_bonus ? "بونص · 0 ₪" : formatMoney(i.unit_price)}
                    />
                    <Mini label="الخصم" value={formatMoney(i.product_discount)} />
                  </dl>
                  {!i.is_bonus && Number(i.base_unit_price) !== Number(i.unit_price) && <p className="mt-2 text-xs text-stone-500">السعر الأساسي: {formatMoney(i.base_unit_price)}</p>}
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
                      "خصم المنتج",
                      "الإجمالي",
                    ].map((x) => (
                      <th
                        key={x}
                        className="px-4 py-3 text-right text-stone-500"
                      >
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-4">
                        <strong className="block text-brand">
                          {i.variant.product.name}
                        </strong>
                        <small>{i.variant.product.code}</small>
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
        <aside className="hidden lg:block lg:sticky lg:top-6">{summary}</aside>
      </div>
      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={async () => { setCancelling(true); try { await ordersService.cancel(order.id); onNavigate("/rep/orders"); } catch (error) { setErrors(apiMessages(error, "تعذر إلغاء الطلب.")); setCancelOpen(false); } finally { setCancelling(false); } }} loading={cancelling} severity="destructive" title="إلغاء الطلب" message="سيتم إلغاء الطلب وعكس أثره على المخزون والحساب. سندات القبض والصرف المستقلة ستبقى كما هي." confirmLabel="إلغاء الطلب" />
      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => void deletePermanent()} loading={deleting} severity="destructive" title="حذف الطلب نهائيًا" message={order.status === "Completed" ? "هل أنت متأكد من حذف هذا الطلب نهائيًا؟ سيعكس النظام أثر البيع ويعيد المخزون." : "هل أنت متأكد من حذف هذا الطلب نهائيًا؟"} confirmLabel="حذف نهائي" cancelLabel="تراجع" />
      <CreateReturnModal open={returnOpen} sourceType="SalesReturn" sourceId={order.id} saleAccountName={order.sale_account?.name} items={order.items.map((item) => ({ productVariantId: Number(item.variant.id), quantity: item.quantity, label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}` }))} onClose={() => setReturnOpen(false)} onSaved={() => { setReturnOpen(false); window.location.reload(); }}/>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <dt className="text-xs font-bold text-stone-400">{label}</dt>
      <dd className="mt-1 font-black">
        {label === "ملاحظات" ? (
          <div className="space-y-3">
            {value.split(/\r?\n/).filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
          </div>
        ) : value}
      </dd>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-400">{label}</dt>
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
    <div
      className={`flex justify-between border-b pb-3 ${strong ? "text-lg" : "text-sm"}`}
    >
      <span className="font-bold text-stone-500">{label}</span>
      <strong className={strong ? "text-red-700" : "text-brand"}>
        {formatMoney(value)}
      </strong>
    </div>
  );
}
