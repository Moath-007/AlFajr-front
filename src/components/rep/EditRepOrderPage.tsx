import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CircleCheck, LoaderCircle, Trash2 } from "lucide-react";
import { ordersService, type UpdateOrderPaymentDto } from "@/api";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";
import { RepSelect } from "./RepFormControls";
import { useCustomerLookup } from "./useCustomerLookup";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RepProductPicker, { type PickedOrderItem } from "./RepProductPicker";
import QuantityInput from "@/components/ui/QuantityInput";
import { useOptionalWholesaleStockVisibility } from "@/rep";

interface ItemDraft {
  product_variant_id: number;
  quantity: number;
  label: string;
  stock?: number;
}
interface PaymentDraft extends UpdateOrderPaymentDto {
  key: string;
  amountText: string;
  checkNumberText: string;
  notesText: string;
}

export default function EditRepOrderPage({
  orderId,
  onNavigate,
  onDirtyChange,
  mode = "representative",
}: {
  orderId: number;
  onNavigate: (path: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  mode?: "representative" | "admin";
}) {
  const showWholesaleStock = useOptionalWholesaleStockVisibility()?.showWholesaleStock ?? false;
  const detailsPath =
    mode === "admin" ? `/owner/orders/${orderId}` : `/rep/orders/${orderId}`;
  const [orderType, setOrderType] = useState<
    "Retail" | "Wholesale" | "StoreSale"
  >("Wholesale");
  const [fields, setFields] = useState({
    customer_name: "",
    phone: "",
    email: "",
    delivery_address: "",
    notes: "",
    order_discount: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmSave, setConfirmSave] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const initialSnapshot = useRef<string | null>(null);
  const [paymentToRemove, setPaymentToRemove] = useState<PaymentDraft | null>(
    null,
  );
  const fillCustomer = useCallback(
    (customer: { name: string; phone: string; email?: string | null }) =>
      setFields((current) => ({
        ...current,
        customer_name: customer.name,
        phone: customer.phone,
        email: customer.email || current.email,
      })),
    [],
  );
  const customerLookup = useCustomerLookup(fields.phone, fillCustomer);
  const snapshot = useMemo(
    () => JSON.stringify({ fields, items, payments }),
    [fields, items, payments],
  );
  const dirty =
    initialSnapshot.current !== null && snapshot !== initialSnapshot.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const warnOnHistoryNavigation = () => {
      if (
        dirty &&
        !window.confirm("لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟")
      )
        window.history.go(1);
    };
    window.addEventListener("popstate", warnOnHistoryNavigation);
    return () =>
      window.removeEventListener("popstate", warnOnHistoryNavigation);
  }, [dirty]);
  useEffect(() => {
    const controller = new AbortController();
    ordersService
      .getById(orderId, controller.signal)
      .then(({ order }) => {
        setOrderType(order.order_type);
        if (mode === "admin" && order.order_type === "Retail") {
          setReadOnly(true);
          setReadOnlyReason("طلبات الأونلاين لا يمكن تعديلها من لوحة الإدارة.");
          return;
        }
        if (order.status !== "Pending") {
          setReadOnly(true);
          setReadOnlyReason("يمكن تعديل الطلبات قيد الانتظار فقط.");
          return;
        }
        setFields({
          customer_name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email || "",
          delivery_address: order.delivery_address || "",
          notes: order.notes || "",
          order_discount: order.order_discount,
        });
        setItems(
          order.items.map((item) => ({
            product_variant_id: item.variant.id,
            quantity: item.quantity,
            label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}`,
          })),
        );
        const loadedPayments = order.payments.map((payment) => ({
          payment_id: payment.id,
          amount: Number(payment.amount),
          amountText: payment.amount,
          payment_method: payment.payment_method,
          check_number: payment.check_number || undefined,
          checkNumberText: payment.check_number || "",
          notes: payment.notes || undefined,
          notesText: payment.notes || "",
          key: `payment-${payment.id}`,
        }));
        setPayments(loadedPayments);
        const loadedFields = {
          customer_name: order.customer.name,
          phone: order.customer.phone,
          email: order.customer.email || "",
          delivery_address: order.delivery_address || "",
          notes: order.notes || "",
          order_discount: order.order_discount,
        };
        const loadedItems = order.items.map((item) => ({
          product_variant_id: item.variant.id,
          quantity: item.quantity,
          label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}`,
        }));
        initialSnapshot.current = JSON.stringify({
          fields: loadedFields,
          items: loadedItems,
          payments: loadedPayments,
        });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrors(apiMessages(error, "تعذر تحميل الطلب."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mode, orderId]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors([]);
    if (
      !fields.customer_name.trim() ||
      !fields.phone.trim() ||
      items.length === 0
    ) {
      setErrors(["اسم العميل والهاتف وعنصر واحد على الأقل مطلوبة."]);
      return;
    }
    if (items.some((item) => item.quantity < 1)) {
      setErrors(["يجب أن تكون كمية كل عنصر واحدًا على الأقل."]);
      return;
    }
    if (
      new Set(items.map((item) => item.product_variant_id)).size !==
      items.length
    ) {
      setErrors(["لا يمكن تكرار نفس خيار المنتج داخل الطلب."]);
      return;
    }
    if (
      payments.some(
        (payment) => !payment.amountText || Number(payment.amountText) <= 0,
      )
    ) {
      setErrors(["يجب أن يكون مبلغ كل دفعة أكبر من صفر."]);
      return;
    }
    if (
      payments.some(
        (payment) =>
          payment.payment_method === "Check" && !payment.checkNumberText.trim(),
      )
    ) {
      setErrors(["رقم الشيك مطلوب عند اختيار الدفع بالشيك."]);
      return;
    }
    setConfirmSave(true);
  };

  const updateOrder = async () => {
    setSubmitting(true);
    try {
      await ordersService.update(orderId, {
        customer_name: fields.customer_name.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        delivery_address: fields.delivery_address.trim() || undefined,
        notes: fields.notes.trim() || undefined,
        order_discount: fields.order_discount
          ? Number(fields.order_discount)
          : 0,
        items: items.map(({ product_variant_id, quantity }) => ({
          product_variant_id,
          quantity,
        })),
        payments: payments.map((payment) => ({
          payment_id: payment.payment_id,
          amount: Number(payment.amountText),
          payment_method: payment.payment_method,
          check_number:
            payment.payment_method === "Check"
              ? payment.checkNumberText.trim()
              : undefined,
          notes: payment.notesText.trim() || undefined,
        })),
      });
      const refreshed = (await ordersService.getById(orderId)).order;
      setFields({
        customer_name: refreshed.customer.name,
        phone: refreshed.customer.phone,
        email: refreshed.customer.email || "",
        delivery_address: refreshed.delivery_address || "",
        notes: refreshed.notes || "",
        order_discount: refreshed.order_discount,
      });
      setItems(
        refreshed.items.map((item) => ({
          product_variant_id: item.variant.id,
          quantity: item.quantity,
          label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}`,
        })),
      );
      setPayments(
        refreshed.payments.map((payment) => ({
          payment_id: payment.id,
          amount: Number(payment.amount),
          amountText: payment.amount,
          payment_method: payment.payment_method,
          check_number: payment.check_number || undefined,
          checkNumberText: payment.check_number || "",
          notes: payment.notes || undefined,
          notesText: payment.notes || "",
          key: `payment-${payment.id}`,
        })),
      );
      initialSnapshot.current = null;
      onDirtyChange?.(false);
      setConfirmSave(false);
      onNavigate(detailsPath);
    } catch (error) {
      setConfirmSave(false);
      setErrors(apiMessages(error, "تعذر تحديث الطلب."));
      window.requestAnimationFrame(() => {
        const errorRegion = document.getElementById("edit-order-errors");
        errorRegion?.focus();
        errorRegion?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <Skeleton className="h-[600px]" />;
  if (readOnly)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <h1 className="text-xl font-black text-brand">هذا الطلب للقراءة فقط</h1>
        <p className="mt-2 text-stone-600">
          {readOnlyReason}
        </p>
        <button
          onClick={() => onNavigate(detailsPath)}
          className="mt-5 rounded-xl bg-brand px-5 py-2.5 font-bold text-white"
        >
          عرض الطلب
        </button>
      </div>
    );
  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <header className="rep-page-header">
          <div>
            <p className="rep-eyebrow">طلب #{orderId}</p>
            <h1 className="rep-title">تعديل الطلب</h1>
            <p className="rep-subtitle">
              سيعيد الباك احتساب الأسعار والمخزون والتوتال عند الحفظ.
            </p>
          </div>
        </header>
        {errors.length > 0 && (
          <div
            id="edit-order-errors"
            className="rep-error outline-none"
            role="alert"
            tabIndex={-1}
          >
            {errors.join("، ")}
          </div>
        )}
        <section className="rep-section">
          <div className="rep-section-heading">
            <h2>بيانات الزبون</h2>
            <p>أدخل رقم الهاتف ثم اضغط جلب البيانات</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="اسم الزبون *"
              value={fields.customer_name}
              onChange={(value) =>
                setFields({ ...fields, customer_name: value })
              }
            />
            <div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <Field
                  label="الهاتف *"
                  value={fields.phone}
                  onChange={(value) => setFields({ ...fields, phone: value })}
                />
                <button
                  type="button"
                  disabled={customerLookup.state === "loading"}
                  onClick={() => void customerLookup.lookup()}
                  className="min-h-11 rounded-xl bg-brand px-4 text-xs font-black text-white disabled:opacity-60"
                >
                  {customerLookup.state === "loading" ? (
                    <LoaderCircle className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    "جلب البيانات"
                  )}
                </button>
              </div>
              {customerLookup.state === "loading" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-stone-500">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> جاري
                  البحث…
                </p>
              )}
              {customerLookup.state === "found" && (
                <div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CircleCheck className="h-3.5 w-3.5" /> تم العثور على بيانات
                    الزبون وتعبئتها
                  </p>
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                    <span className="font-bold text-stone-600">
                      المبلغ القديم المستحق
                    </span>
                    <strong className="text-sm text-amber-800">
                      {formatMoney(
                        customerLookup.customer?.total_outstanding_amount ??
                          "0",
                      )}
                    </strong>
                  </div>
                </div>
              )}
              {customerLookup.state === "new" && (
                <p className="mt-2 text-xs font-bold text-stone-500">
                  رقم جديد — يمكنك إدخال بيانات زبون جديد
                </p>
              )}
              {customerLookup.state === "error" && (
                <p className="mt-2 text-xs font-bold text-red-600">
                  {customerLookup.messages.join("، ")}
                </p>
              )}
            </div>
            <Field
              label="البريد"
              value={fields.email}
              onChange={(value) => setFields({ ...fields, email: value })}
            />
            <Field
              label="العنوان"
              value={fields.delivery_address}
              onChange={(value) =>
                setFields({ ...fields, delivery_address: value })
              }
            />
            <Field
              label="خصم الطلب"
              type="number"
              value={fields.order_discount}
              onChange={(value) =>
                setFields({ ...fields, order_discount: value })
              }
            />
            <Field
              label="الملاحظات"
              value={fields.notes}
              onChange={(value) => setFields({ ...fields, notes: value })}
            />
          </div>
        </section>
        <section className="rep-section">
          <div className="rep-section-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2>عناصر الطلب</h2>
                <p>عدّل الكميات أو اختر منتجًا وخيارًا جديدًا من الكتالوج</p>
              </div>
              <button
                type="button"
                onClick={() => setProductPickerOpen(true)}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white"
              >
                + إضافة منتج
              </button>
            </div>
          </div>
          <div className="divide-y px-5">
            {items.map((item) => (
              <div
                key={item.product_variant_id}
                className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
              >
                <strong className="text-sm text-stone-800">{item.label}</strong>
                <div className="flex items-center gap-3">
                  <QuantityInput value={item.quantity} max={item.stock ?? Number.MAX_SAFE_INTEGER} onChange={(quantity) => setItems(items.map((entry) => entry.product_variant_id === item.product_variant_id ? { ...entry, quantity } : entry))} showStock={orderType === "StoreSale" || (orderType === "Wholesale" && showWholesaleStock)} />
                  <button
                    type="button"
                    onClick={() =>
                      setItems(
                        items.filter(
                          (entry) =>
                            entry.product_variant_id !==
                            item.product_variant_id,
                        ),
                      )
                    }
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rep-section">
          <div className="rep-section-heading flex-row items-center justify-between">
            <div>
              <h2>الحالة النهائية للدفعات</h2>
              <p>الدفعة المحذوفة من القائمة ستحذف عند الحفظ</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setPayments([
                  ...payments,
                  {
                    key: crypto.randomUUID(),
                    amount: 0,
                    amountText: "",
                    payment_method: "Cash",
                    checkNumberText: "",
                    notesText: "",
                  },
                ])
              }
              className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-black text-brand"
            >
              + دفعة جديدة
            </button>
          </div>
          <div className="space-y-3 p-5">
            {payments.length === 0 && (
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                لا توجد دفعات في الحالة النهائية.
              </p>
            )}
            {payments.map((payment) => (
              <div
                key={payment.key}
                className="grid gap-3 rounded-xl border bg-stone-50/50 p-4 sm:grid-cols-4"
              >
                <Field
                  label="المبلغ"
                  type="number"
                  value={payment.amountText}
                  onChange={(value) =>
                    setPayments(
                      payments.map((entry) =>
                        entry.key === payment.key
                          ? { ...entry, amountText: value }
                          : entry,
                      ),
                    )
                  }
                />
                <RepSelect
                  label="الطريقة"
                  value={payment.payment_method}
                  options={[
                    { value: "Cash", label: "نقدًا" },
                    { value: "Check", label: "شيك" },
                  ]}
                  onChange={(value) =>
                    setPayments(
                      payments.map((entry) =>
                        entry.key === payment.key
                          ? {
                              ...entry,
                              payment_method: value,
                              checkNumberText: "",
                            }
                          : entry,
                      ),
                    )
                  }
                />
                {payment.payment_method === "Check" && (
                  <Field
                    label="رقم الشيك"
                    value={payment.checkNumberText}
                    onChange={(value) =>
                      setPayments(
                        payments.map((entry) =>
                          entry.key === payment.key
                            ? { ...entry, checkNumberText: value }
                            : entry,
                        ),
                      )
                    }
                  />
                )}
                <Field
                  label="ملاحظات"
                  value={payment.notesText}
                  onChange={(value) =>
                    setPayments(
                      payments.map((entry) =>
                        entry.key === payment.key
                          ? { ...entry, notesText: value }
                          : entry,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() => setPaymentToRemove(payment)}
                  className="justify-self-start text-xs font-bold text-red-600"
                >
                  حذف من الحالة النهائية
                </button>
              </div>
            ))}
          </div>
        </section>
        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row">
          <button
            disabled={submitting}
            className="rounded-xl bg-brand px-7 py-3 font-black text-white disabled:opacity-60"
          >
            {submitting ? "جاري الحفظ…" : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate(detailsPath)}
            className="rounded-xl border bg-white px-7 py-3 font-bold text-stone-600"
          >
            إلغاء
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={() => void updateOrder()}
        loading={submitting}
        severity="normal"
        title="تأكيد حفظ التعديلات"
        message="هل أنت متأكد أنك تريد حفظ تعديلات الطلب؟ ستُعاد مراجعة العناصر والمخزون والدفعات والخصم."
        confirmLabel="حفظ التعديلات"
        details={
          <p>
            العناصر: <strong>{items.length}</strong> — الدفعات:{" "}
            <strong>{payments.length}</strong>
          </p>
        }
      />
      <RepProductPicker
        open={productPickerOpen}
        existing={items}
        onClose={() => setProductPickerOpen(false)}
        priceMode={orderType === "Wholesale" ? "wholesale" : "retail"}
        onAdd={(picked: PickedOrderItem) =>
          setItems((current) => {
            const existing = current.find(
              (item) => item.product_variant_id === picked.product_variant_id,
            );
            if (!existing) return [...current, picked];
            return current.map((item) =>
              item.product_variant_id === picked.product_variant_id
                ? {
                    ...item,
                    quantity: Math.min(
                      item.quantity + picked.quantity,
                      picked.stock,
                    ),
                    stock: picked.stock,
                  }
                : item,
            );
          })
        }
      />
      <ConfirmDialog
        open={paymentToRemove !== null}
        onClose={() => setPaymentToRemove(null)}
        onConfirm={() => {
          if (paymentToRemove)
            setPayments((current) =>
              current.filter((entry) => entry.key !== paymentToRemove.key),
            );
          setPaymentToRemove(null);
        }}
        severity="destructive"
        title="حذف الدفعة"
        message="هل أنت متأكد أنك تريد حذف هذه الدفعة من الحالة النهائية؟ سيُنفذ الحذف عند حفظ الطلب."
        confirmLabel="حذف الدفعة"
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
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
