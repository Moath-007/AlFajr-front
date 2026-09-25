import { useEffect, useState } from "react";
import { paymentsService, type PaymentDto } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeConvertedMoney, formatMoney } from "@/utils/money";

export default function PaymentDetailsModal({ paymentId, onClose }: { paymentId: number | null; onClose: () => void }) {
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!paymentId) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setPayment(null);
    paymentsService.getById(paymentId, controller.signal)
      .then((response) => setPayment(response.payment))
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, "تعذر تحميل تفاصيل الدفعة.").join("، ")); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [paymentId]);
  return <Modal open={paymentId !== null} onClose={onClose} title={`تفاصيل الدفعة #${paymentId ?? ""}`} size="lg">
    {loading ? <Skeleton className="h-72"/> : error ? <div className="rep-error">{error}</div> : payment ? <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2"><Info label="المبلغ" value={describeConvertedMoney(payment.amount, payment.base_amount, payment.exchange_rate, payment.currency)}/><Info label="الحالة" value={stateLabel(payment.effective_state)}/><Info label="الطريقة" value={payment.payment_method === "Cash" ? "نقدًا" : "شيك"}/><Info label="تاريخ الدفع" value={new Date(payment.paid_at).toLocaleString("ar-EG-u-nu-latn")}/>{payment.currency && <Info label="العملة" value={`${payment.currency.code} — ${payment.currency.name} (${payment.currency.symbol})`}/>}<Info label="سعر الصرف" value={payment.exchange_rate ?? "—"}/><Info label="المبلغ الأساسي" value={payment.base_amount ? formatMoney(payment.base_amount) : "—"}/><Info label="سجلها" value={payment.recorded_by?.name ?? "—"}/><Info label="آخر تحديث" value={payment.updated_by?.name ?? "—"}/>{payment.cancelled_at && <Info label="الإلغاء" value={`${new Date(payment.cancelled_at).toLocaleString("ar-EG-u-nu-latn")} · ${payment.cancelled_by?.name ?? "—"}`}/>}</section>
      {payment.notes && <section className="rounded-xl border p-3"><h3 className="font-black text-brand">ملاحظات</h3><p className="mt-1 text-sm text-stone-600">{payment.notes}</p></section>}
      {payment.check && <section className="rounded-xl border p-3"><h3 className="font-black text-brand">بيانات الشيك</h3><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>الرقم: <b>{payment.check.check_number}</b></p><p>الحالة: <b>{checkLabel(payment.check.status)}</b></p><p>الاستحقاق: <b>{payment.check.due_date ? new Date(payment.check.due_date).toLocaleDateString("ar-EG-u-nu-latn") : "—"}</b></p><p>الحساب/البنك/الفرع: <b>{[payment.check.account_number, payment.check.bank_number, payment.check.branch_number].filter(Boolean).join(" / ") || "—"}</b></p>{payment.check.return_reason && <p className="sm:col-span-2">سبب الإرجاع: <b>{payment.check.return_reason}</b></p>}</div></section>}
    </div> : null}
  </Modal>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-stone-50 p-3"><small className="text-stone-500">{label}</small><b className="mt-1 block text-brand">{value}</b></div>; }
const stateLabel = (state: PaymentDto["effective_state"]) => state === "Effective" ? "فعّالة" : state === "Returned" ? "راجعة" : "ملغاة";
const checkLabel = (status: "Pending" | "Collected" | "Returned") => status === "Pending" ? "قيد الانتظار" : status === "Collected" ? "محصّل" : "راجع";
