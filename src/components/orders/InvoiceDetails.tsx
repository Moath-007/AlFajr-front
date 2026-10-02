import { useEffect, useRef, useState } from "react";
import { ordersService, type OrderResponseDto } from "@/api";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import OrderReceipt from "@/components/ui/OrderReceipt";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import GeneralSaleAccountSelect from "./GeneralSaleAccountSelect";
import { useGeneralSaleAccounts } from "./useGeneralSaleAccounts";
import { canEditOrder } from "./orderEditPermission";
import { rememberOrderDeleted } from "./orderDeleteFeedback";
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
  const accounts = useGeneralSaleAccounts(action === "confirm");
  const path = mode === "admin" ? "/owner/orders" : "/rep/orders";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
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
  if (loading) return <p>جاري تحميل الفاتورة…</p>;
  if (!order)
    return (
      <div role="alert">
        {error}
        <button className="btn-outline" onClick={() => setRetry((n) => n + 1)}>
          إعادة المحاولة
        </button>
      </div>
    );
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <button className="btn-outline" onClick={() => onNavigate(path)}>
          رجوع
        </button>
        <h1 className="text-2xl font-black">فاتورة #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </header>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {canEditOrder(order, mode === "admin" ? "Admin" : "Representative") && (
          <button
            className="btn-primary"
            onClick={() => onNavigate(`${path}/${order.id}/edit`)}
          >
            تعديل الفاتورة
          </button>
        )}
        {mode === "admin" && order.status === "Pending" && (
          <button className="btn-primary" onClick={() => setAction("confirm")}>
            تأكيد الطلب
          </button>
        )}
        {order.status !== "Cancelled" && (
          <button className="btn-outline" onClick={() => setAction("cancel")}>
            إلغاء الفاتورة
          </button>
        )}
        <button className="btn-danger" onClick={() => setAction("delete")}>
          حذف نهائي
        </button>
        <OrderReceipt order={order} />
      </div>
      <section className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-2">
        <p>
          حساب البيع: <b>{order.sale_account?.name ?? "يُحدد عند التأكيد"}</b>
        </p>
        <p>المنشئ: {order.creator?.name ?? "طلب عام"}</p>
        <p className="whitespace-pre-wrap">{order.contact_text}</p>
        <p>{order.delivery_address}</p>
        <p>التاريخ: {formatOrderDate(order.created_at)}</p>
        <p>{order.notes}</p>
      </section>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[650px] text-right">
          <thead>
            <tr>
              {[
                "المنتج",
                "الكمية",
                "سعر الوحدة",
                "خصم الوحدة",
                "قيمة البند",
              ].map((label) => (
                <th className="p-3" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3">
                  {i.variant.product.name} — {i.variant.size} —{" "}
                  {i.variant.color.name}
                  {i.is_bonus && <b className="block text-gold-dark">بونص</b>}
                </td>
                <td>{i.quantity}</td>
                <td>{formatMoney(i.unit_price)}</td>
                <td>{formatMoney(i.product_discount)}</td>
                <td>{formatMoney(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>خصم الفاتورة: {formatMoney(order.order_discount)}</p>
      <p className="text-xl font-black">
        الإجمالي: {formatMoney(order.total_amount)}
      </p>
      <ConfirmDialog
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
