import { useEffect, useRef, useState } from "react";
import { Banknote, CalendarDays, Landmark, UserRound } from "lucide-react";
import {
  paymentsService,
  type CheckDisplayStatus,
  type PaymentDto,
} from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { describeConvertedMoney, formatMoney } from "@/utils/money";
import { useAuth } from "@/auth";
import { Link } from "react-router-dom";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditPaymentModal from "./EditPaymentModal";

export default function PaymentDetailsModal({
  paymentId,
  onClose,
  onLoaded,
}: {
  paymentId: number | null;
  onClose: () => void;
  onLoaded?: (payment: PaymentDto) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false),
    [cancelOpen, setCancelOpen] = useState(false),
    [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(paymentId),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    setActiveId(paymentId);
    setEditing(false);
    setCancelOpen(false);
  }, [paymentId]);
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const onLoadedRef = useRef(onLoaded);
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);
  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPayment(null);
    paymentsService
      .getById(activeId, controller.signal)
      .then((response) => {
        setPayment(response.payment);
        onLoadedRef.current?.(response.payment);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(apiMessages(reason, "تعذر تحميل تفاصيل الدفعة.").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [activeId, revision]);
  return (
    <Modal
      open={paymentId !== null}
      onClose={onClose}
      title={
        payment
          ? `تفاصيل ${payment.payment_type === "Receipt" ? "سند القبض" : "سند الصرف"} #${payment.voucher_number ?? `${payment.payment_type === "Receipt" ? "RV" : "PV"}-${payment.id}`}`
          : `تفاصيل السند #${paymentId ?? ""}`
      }
      size="lg"
    >
      {loading ? (
        <Skeleton className="h-72" />
      ) : error ? (
        <div className="rep-error">{error}</div>
      ) : payment ? (
        <div className="space-y-6" dir="rtl">
          <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-5 text-white sm:px-6">
            <span className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white/60">قيمة الدفعة</p>
                <strong className="mt-1 block text-2xl font-black sm:text-3xl">
                  {describeConvertedMoney(
                    payment.amount,
                    payment.base_amount,
                    payment.exchange_rate,
                    payment.currency,
                  )}
                </strong>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-black ${financialState(payment) === "Effective" ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-red-300/40 bg-red-400/15 text-red-100"}`}
              >
                {stateLabel(financialState(payment))}
              </span>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/75">
              <span className="inline-flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                {payment.payment_method === "Cash" ? "دفعة نقدية" : "دفعة بشيك"}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(payment.paid_at).toLocaleString("ar-EG-u-nu-latn")}
              </span>
              {payment.account?.name && (
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {payment.account.name}
                </span>
              )}
            </div>
          </section>

          {financialState(payment) === "Returned" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <b className="block">الشيك راجع وأثر هذه الدفعة المالي ملغى</b>
              <span className="mt-1 block text-xs text-red-600">
                يبقى سجل الدفعة ظاهرًا لأغراض المحاسبة والتدقيق فقط.
              </span>
            </div>
          )}

          {payment.check && <CheckDetails check={payment.check} />}

          <section>
            <SectionTitle>معلومات الدفعة</SectionTitle>
            <div className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200 px-4">
              {payment.currency && (
                <DetailRow
                  label="العملة"
                  value={`${payment.currency.code} — ${payment.currency.name} (${payment.currency.symbol})`}
                />
              )}
              <DetailRow
                label="سعر الصرف"
                value={payment.exchange_rate ?? "—"}
              />
              <DetailRow
                label="المبلغ بالعملة الأساسية"
                value={
                  payment.base_amount ? formatMoney(payment.base_amount) : "—"
                }
              />
              <DetailRow
                label="سجلها"
                value={payment.recorded_by?.name ?? "النظام"}
              />
              {payment.updated_by?.name && (
                <DetailRow
                  label="آخر تعديل بواسطة"
                  value={payment.updated_by.name}
                />
              )}
              {payment.cancelled_at && (
                <DetailRow
                  label="الإلغاء"
                  value={`${new Date(payment.cancelled_at).toLocaleString("ar-EG-u-nu-latn")} · ${payment.cancelled_by?.name ?? "—"}`}
                  danger
                />
              )}
            </div>
          </section>

          {payment.notes && (
            <section className="rounded-xl bg-stone-50 px-4 py-3">
              <p className="text-xs font-bold text-stone-400">ملاحظات</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                {payment.notes}
              </p>
            </section>
          )}
          {user?.role === "Admin" && (
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {payment.check?.managed_check_id && (
                <Link
                  className="btn-outline"
                  to={`/owner/checks/${payment.check.managed_check_id}`}
                >
                  تفاصيل الشيك وإجراءاته
                </Link>
              )}
              {payment.effective_state === "Effective" && (
                <>
                  {(payment.payment_method === "Cash" ||
                    (payment.check?.managed_check_id &&
                      ["TREASURY", "ISSUED"].includes(
                        payment.check.location ?? "",
                      ))) && (
                    <button
                      className="btn-outline"
                      onClick={() => setEditing(true)}
                    >
                      تصحيح السند
                    </button>
                  )}
                  {payment.payment_method === "Check" &&
                    !["TREASURY", "ISSUED"].includes(
                      payment.check?.location ?? "",
                    ) && (
                      <p className="w-full text-sm text-stone-500">
                        تصحيح السند يتطلب التراجع عن حركات الشيك اللاحقة أولًا.
                      </p>
                    )}
                  {(!payment.check ||
                    ["TREASURY", "ISSUED"].includes(
                      payment.check.location ?? "",
                    )) && (
                    <button
                      className="btn-outline text-red-700"
                      onClick={() => setCancelOpen(true)}
                    >
                      إلغاء السند
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {editing && (
            <EditPaymentModal
              payment={payment}
              onClose={() => setEditing(false)}
              onSaved={(id) => {
                setEditing(false);
                setActiveId(id);
                setRevision((r) => r + 1);
              }}
            />
          )}
          <ConfirmDialog
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            loading={saving}
            title="إلغاء السند"
            message="سيُعكس القيد الأصلي مع حفظ السند والتاريخ. يجب التراجع عن حركات الشيك الفعّالة أولًا."
            onConfirm={() => {
              if (saving) return;
              setSaving(true);
              void paymentsService
                .cancel(payment.id)
                .then(() => {
                  setCancelOpen(false);
                  setRevision((r) => r + 1);
                })
                .catch((e) =>
                  setError(apiMessages(e, "تعذر إلغاء السند.").join("، ")),
                )
                .finally(() => setSaving(false));
            }}
          />
        </div>
      ) : null}
    </Modal>
  );
}

function CheckDetails({ check }: { check: NonNullable<PaymentDto["check"]> }) {
  const status = normalizedCheckStatus(check);
  const tone =
    status === "NotDue"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "Due"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/70 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold text-stone-400">بيانات الشيك</p>
            <b className="block text-lg text-brand">#{check.check_number}</b>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${tone}`}
        >
          {checkLabel(status)}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3">
        <CheckField
          label="تاريخ الاستحقاق"
          value={
            check.due_date
              ? new Date(check.due_date).toLocaleDateString("ar-EG-u-nu-latn")
              : "غير محدد"
          }
        />
        <CheckField
          label="رقم البنك"
          value={check.bank_number || "—"}
          numeric
        />
        <CheckField
          label="رقم الفرع"
          value={check.branch_number || "—"}
          numeric
        />
        <CheckField
          label="رقم الحساب"
          value={check.account_number || "—"}
          numeric
          className="sm:col-span-2 lg:col-span-3"
        />
      </div>
      {check.return_reason && (
        <div className="border-t border-red-100 bg-red-50/60 px-4 py-3 sm:px-5">
          <p className="text-xs font-bold text-red-500">سبب الإرجاع</p>
          <p className="mt-1 text-sm font-bold text-red-800">
            {check.return_reason}
          </p>
        </div>
      )}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-black text-brand">{children}</h3>;
}
function DetailRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span className="text-stone-500">{label}</span>
      <b className={danger ? "text-red-700" : "text-brand"}>{value}</b>
    </div>
  );
}
function CheckField({
  label,
  value,
  numeric = false,
  className = "",
}: {
  label: string;
  value: string;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 border-b border-stone-100 px-4 py-3 last:border-b-0 sm:border-l sm:px-5 ${className}`}
    >
      <span className="block text-xs text-stone-400">{label}</span>
      <b
        dir={numeric ? "ltr" : undefined}
        className={`mt-1 block break-words text-sm text-brand ${numeric ? "text-left font-mono tracking-wide" : ""}`}
      >
        {value}
      </b>
    </div>
  );
}
const stateLabel = (state: PaymentDto["effective_state"]) =>
  state === "Effective"
    ? "مؤثرة على الحساب"
    : state === "Returned"
      ? "أثرها المالي ملغى"
      : "ملغاة";
const financialState = (payment: PaymentDto): PaymentDto["effective_state"] =>
  payment.check?.status === "Returned" ? "Returned" : payment.effective_state;
const checkLabel = (status: CheckDisplayStatus) =>
  status === "NotDue" ? "غير مستحق" : status === "Due" ? "مستحق" : "راجع";

function normalizedCheckStatus(
  check: NonNullable<PaymentDto["check"]>,
): CheckDisplayStatus {
  const storedStatus = check.status as string;
  if (storedStatus === "Returned") return "Returned";
  if (storedStatus === "NotDue" || storedStatus === "Due") return storedStatus;
  if (!check.due_date) return "Due";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(check.due_date)) >
    formatter.format(new Date())
    ? "NotDue"
    : "Due";
}
