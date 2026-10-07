import { ordersService, type OrderResponseDto } from "@/api";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import OrderReceipt from "@/components/ui/OrderReceipt";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import GeneralSaleAccountSelect from "./GeneralSaleAccountSelect";
import { rememberOrderDeleted } from "./orderDeleteFeedback";
import { canEditOrder } from "./orderEditPermission";
import { usePaginatedSaleAccounts } from "./usePaginatedSaleAccounts";
export default function InvoiceDetails({
  orderId,
  onNavigate,
  mode,
}: {
  orderId: number;
  onNavigate: (path: string) => void;
  mode: "admin" | "representative";
}) {
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<"confirm" | "cancel" | "delete" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<number | null>(null);
  const lock = useRef(false);
  const itemsSection = useRef<HTMLDivElement>(null);
  const actionsSection = useRef<HTMLElement>(null);
  const goToSection = (section: HTMLElement | null) => {
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: "start", behavior: "auto" });
  };
  const accounts = usePaginatedSaleAccounts(action === "confirm", order?.sale_account?.kind === 'General' ? order.sale_account : null);
  const path = mode === "admin" ? "/owner/orders" : "/rep/orders";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setOrder(null);
    ordersService
      .getById(orderId, controller.signal)
      .then((r) => {
        if (!controller.signal.aborted) {
          setOrder(r.order);
          setAccount(r.order.sale_account_id);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل الفاتورة").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, retry]);
  const perform = async () => {
    if (!action || lock.current) return;
    if (
      action === "confirm" &&
      (account === null || !accounts.accounts.some((a) => a.id === account))
    ) {
      setError("اختر حساب البيع.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "delete") {
        const r = await ordersService.deletePermanent(orderId);
        rememberOrderDeleted(mode, r.message);
        onNavigate(path);
      } else {
        if (action === "confirm")
          await ordersService.confirm(orderId, account!);
        else await ordersService.cancel(orderId);
        setRetry((n) => n + 1);
      }
      setAction(null);
    } catch (e) {
      setError(apiMessages(e, "تعذر تنفيذ العملية").join("، "));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (loading) return <div role="status" className="rep-section flex min-h-64 items-center justify-center gap-3 text-sm text-stone-500"><Loader2 aria-hidden className="h-5 w-5 animate-spin" />جاري تحميل الفاتورة…</div>;
  if (!order)
    return (
      <div role="alert" className="rep-error flex flex-wrap items-center gap-3">
        {error}
        <button className="btn-outline" onClick={() => setRetry((n) => n + 1)}>
          إعادة المحاولة
        </button>
        <button className="btn-ghost" onClick={() => onNavigate(path)}>رجوع للفواتير</button>
      </div>
    );
  return (
    <div className="orders-page space-y-3 min-w-0" dir="rtl">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" aria-label="رجوع للفواتير" title="رجوع للفواتير" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" onClick={() => onNavigate(path)}>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-black">فاتورة #{order.id}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="flex items-baseline gap-2 text-sm text-stone-500">الإجمالي <b className="text-xl font-black tabular-nums text-brand">{formatMoney(order.total_amount)}</b></p>
      </header>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      <section ref={actionsSection} tabIndex={-1} id="invoice-actions" aria-label="إجراءات الفاتورة" className="rep-section scroll-mt-24 p-3 outline-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="sr-only">إدارة الفاتورة</h2><div className="flex flex-wrap gap-2">
            {mode === "representative" && order.status === "Pending" && <p className="text-sm text-stone-500">الطلب قيد الانتظار.</p>}
            {mode === "admin" && order.status === "Pending" && <button disabled={busy} className="btn-primary" onClick={() => setAction("confirm")}>تأكيد الطلب</button>}
            {canEditOrder(order, mode === "admin" ? "Admin" : "Representative") && <button disabled={busy} className={order.status === "Pending" ? "btn-outline" : "btn-primary"} onClick={() => onNavigate(`${path}/${order.id}/edit`)}>تعديل الفاتورة</button>}
            {order.status === "Cancelled" && <p className="text-sm text-stone-500">الفاتورة ملغاة؛ يمكنك طباعة نسخة أو تحميلها.</p>}
          </div></div>
          <div><h2 className="sr-only">طباعة وتصدير</h2><OrderReceipt order={order} /></div>
        </div>
        <details className="mt-3 border-t border-stone-100 pt-1">
          <summary className="w-fit cursor-pointer rounded-lg px-2 py-2 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">إجراءات الإلغاء والحذف</summary>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-100 bg-red-50/40 p-3">
            {order.status !== "Cancelled" && <button disabled={busy} className="btn-outline border-red-200 text-red-700 hover:bg-red-50" onClick={() => setAction("cancel")}>إلغاء الفاتورة</button>}
            <button disabled={busy} className="btn-danger" onClick={() => setAction("delete")}>حذف نهائي</button>
            <p className="text-xs leading-5 text-stone-500">تتطلب هذه الإجراءات تأكيداً قبل التنفيذ.</p>
          </div>
        </details>
      </section>
      <section aria-label="بيانات الفاتورة" className="grid gap-x-5 gap-y-2 rounded-2xl border bg-white p-3 text-sm leading-6 sm:grid-cols-2 lg:grid-cols-3 [&>p]:min-w-0 [&>p]:break-words">
        <p>
          حساب البيع: <b>{order.sale_account?.name ?? "يُحدد عند التأكيد"}</b>
        </p>
        <p>المنشئ: {order.creator?.name ?? "طلب عام"}</p>
        {order.contact_text && <p className="whitespace-pre-wrap">التواصل: {order.contact_text}</p>}
        {order.delivery_address && <p>العنوان: {order.delivery_address}</p>}
        <p>التاريخ: {formatOrderDate(order.created_at)}</p>
        {order.notes && <details className="sm:col-span-2 lg:col-span-3" open={order.notes.length <= 300 ? true : undefined}><summary className="w-fit cursor-pointer rounded-lg py-1 text-sm font-bold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">ملاحظات الفاتورة</summary><p className="mt-2 whitespace-pre-wrap break-words leading-7 text-stone-600">{order.notes}</p></details>}
        {order.items.length > 5 && <button type="button" className="btn-ghost w-fit" onClick={() => goToSection(itemsSection.current)}>الانتقال إلى المنتجات</button>}
      </section>
      <div ref={itemsSection} tabIndex={-1} id="invoice-items" className="rep-section overflow-hidden scroll-mt-24 outline-none">
        <div className="border-b border-stone-100 px-3 py-3"><h2 className="text-sm font-bold text-brand">المنتجات والكميات <span className="font-normal text-stone-500">({order.items.length})</span></h2></div>
        <table className="orders-table w-full table-fixed text-right">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              {[
                "المنتج",
                "الكمية",
                "سعر الوحدة",
                "خصم الوحدة",
                "قيمة البند",
              ].map((label) => (
                <th className={`p-3 ${label === "المنتج" ? "md:w-[44%]" : ""}`} key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-t">
                <td data-label="المنتج" className="p-3 break-words">
                  {i.variant.product.name} — {i.variant.size} —{" "}
                  {i.variant.color.name}
                  {i.is_bonus && <b className="block text-gold-dark">بونص</b>}
                </td>
                <td data-label="الكمية" className="p-3">{i.quantity}</td>
                <td data-label="سعر الوحدة" className="p-3">{formatMoney(i.unit_price)}</td>
                <td data-label="خصم الوحدة" className="p-3">{formatMoney(i.product_discount)}</td>
                <td data-label="قيمة البند" className="p-3 font-bold">{formatMoney(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-stone-200 bg-stone-50 px-3 py-3">
          <p className="text-sm text-stone-500">خصم الفاتورة: {formatMoney(order.order_discount)}</p>
          <p className="text-base font-black text-brand">
            الإجمالي: {formatMoney(order.total_amount)}
          </p>
          {order.items.length > 5 && <button type="button" className="btn-outline" onClick={() => goToSection(actionsSection.current)}>العودة لأزرار الفاتورة</button>}
        </div>
      </div>
      <ConfirmDialog
        severity={action === "confirm" ? "normal" : "destructive"}
        cancelLabel="تراجع"
        confirmLabel={action === "confirm" ? "تأكيد الفاتورة" : action === "delete" ? "حذف نهائي" : "إلغاء الفاتورة"}
        open={action !== null}
        title={
          action === "confirm"
            ? "تأكيد الفاتورة"
            : action === "delete"
              ? "حذف نهائي"
              : "إلغاء الفاتورة"
        }
        message={
          action === "confirm"
            ? "سيتم خصم المخزون وتسجيل البيع في الحساب المختار."
            : "سيتم عكس أثر الفاتورة المالي والمخزني إن وجد؛ السندات المستقلة تبقى كما هي."
        }
        loading={busy}
        confirmDisabled={
          action === "confirm" &&
          (accounts.loading || !!accounts.error || account === null)
        }
        details={
          <>
            {action === "confirm" && (
              <GeneralSaleAccountSelect
                floating
                {...accounts}
                onRetry={accounts.reload}
                value={account}
                onChange={setAccount}
              />
            )}
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
          </>
        }
        onClose={() => {
          if (!busy) setAction(null);
        }}
        onConfirm={() => void perform()}
      />
    </div>
  );
}
