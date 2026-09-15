import { useCallback, useState, type FormEvent } from "react";
import {
  CircleCheck,
  LoaderCircle,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  ordersService,
  type PaymentMethod,
  type WholesalePaymentDto,
} from "@/api";
import QuantityInput from "@/components/ui/QuantityInput";
import { useOptionalWholesaleStockVisibility, useWholesaleCart } from "@/rep";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { RepFormSection, RepSelect } from "./RepFormControls";
import { useCustomerLookup } from "./useCustomerLookup";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface PaymentDraft {
  key: string;
  amount: string;
  payment_method: PaymentMethod;
  check_number: string;
  notes: string;
}
const emptyPayment = (): PaymentDraft => ({
  key: crypto.randomUUID(),
  amount: "",
  payment_method: "Cash",
  check_number: "",
  notes: "",
});

export default function CreateWholesaleOrderPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { items, updateQuantity, removeItem, clearCart } = useWholesaleCart();
  const showWholesaleStock = useOptionalWholesaleStockVisibility()?.showWholesaleStock ?? false;
  const [fields, setFields] = useState({
    customer_name: "",
    phone: "",
    email: "",
    delivery_address: "",
    notes: "",
    order_discount: "",
  });
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{
    id: number;
    name: string;
  } | null>(null);
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
  const previewSubtotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.display_price) - Number(item.display_discount)) *
        item.quantity,
    0,
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors([]);
    if (
      !fields.customer_name.trim() ||
      !fields.phone.trim() ||
      items.length === 0
    ) {
      setErrors(["اسم العميل والهاتف ووجود منتج واحد على الأقل مطلوبة."]);
      return;
    }
    if (
      payments.some((payment) => !payment.amount || Number(payment.amount) <= 0)
    ) {
      setErrors(["يجب أن يكون مبلغ كل دفعة أكبر من صفر."]);
      return;
    }
    const invalidCheck = payments.some(
      (payment) =>
        payment.payment_method === "Check" && !payment.check_number.trim(),
    );
    if (invalidCheck) {
      setErrors(["رقم الشيك مطلوب عند اختيار الدفع بالشيك."]);
      return;
    }
    setConfirmOpen(true);
  };

  const createOrder = async () => {
    setSubmitting(true);
    try {
      const formattedPayments: WholesalePaymentDto[] = payments.map(
        (payment) => ({
          amount: Number(payment.amount),
          payment_method: payment.payment_method,
          check_number:
            payment.payment_method === "Check"
              ? payment.check_number.trim()
              : undefined,
          notes: payment.notes.trim() || undefined,
        }),
      );
      const response = await ordersService.createWholesale({
        customer_name: fields.customer_name.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        delivery_address: fields.delivery_address.trim() || undefined,
        notes: fields.notes.trim() || undefined,
        order_discount: fields.order_discount
          ? Number(fields.order_discount)
          : undefined,
        items: items.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
        })),
        payments: formattedPayments.length ? formattedPayments : undefined,
      });
      await ordersService.getById(response.order.order_id);
      setConfirmOpen(false);
      clearCart();
      onNavigate(`/rep/orders/${response.order.order_id}`);
    } catch (error) {
      setConfirmOpen(false);
      setErrors(apiMessages(error, "تعذر إنشاء الطلب."));
      window.requestAnimationFrame(() =>
        window.scrollTo({ top: 0, behavior: "smooth" }),
      );
    } finally {
      setSubmitting(false);
    }
  };
  if (items.length === 0)
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-stone-300" />
        <h1 className="mt-4 text-2xl font-black text-brand">
          سلة الجملة فارغة
        </h1>
        <p className="mt-2 text-stone-500">
          اختر منتجًا وخيارًا واحدًا على الأقل لإنشاء الطلب.
        </p>
        <button
          onClick={() => onNavigate("/rep/products")}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-black text-white"
        >
          تصفح المنتجات
        </button>
      </div>
    );
  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        <header className="rep-page-header">
          <div>
            <p className="rep-eyebrow">طلب جديد</p>
            <h1 className="rep-title">إنشاء طلب جملة</h1>
            <p className="rep-subtitle">
              المبالغ المعروضة تقديرية، والباك هو المرجع النهائي للأسعار
              والمخزون.
            </p>
          </div>
        </header>
        {errors.length > 0 && (
          <div className="rep-error" role="alert">
            {errors.join("، ")}
          </div>
        )}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <RepFormSection
              title="بيانات الزبون"
              description="أدخل رقم الهاتف ثم اضغط جلب البيانات"
              icon={<UserRound className="h-5 w-5" />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
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
                      label="رقم الهاتف *"
                      value={fields.phone}
                      onChange={(value) =>
                        setFields({ ...fields, phone: value })
                      }
                    />
                    <button
                      type="button"
                      disabled={customerLookup.state === "loading"}
                      onClick={() => void customerLookup.lookup()}
                      className="min-h-11 rounded-xl bg-brand px-4 text-xs font-black text-white transition hover:bg-brand-700 disabled:opacity-60"
                    >
                      {customerLookup.state === "loading" ? (
                        <LoaderCircle className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        "جلب البيانات"
                      )}
                    </button>
                  </div>
                  {customerLookup.state === "found" && (
                    <>
                      <LookupNote
                        success
                        icon={<CircleCheck className="h-3.5 w-3.5" />}
                        text="تم العثور على بيانات الزبون وتعبئتها"
                      />
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
                    </>
                  )}
                  {customerLookup.state === "new" && (
                    <LookupNote text="لا يوجد زبون بهذا الرقم — أكمل البيانات كزبون جديد" />
                  )}
                  {customerLookup.state === "error" && (
                    <p className="mt-2 text-xs font-bold text-red-600">
                      {customerLookup.messages.join("، ")}
                    </p>
                  )}
                </div>
                <Field
                  label="البريد الإلكتروني"
                  type="email"
                  value={fields.email}
                  onChange={(value) => setFields({ ...fields, email: value })}
                />
                <Field
                  label="عنوان التسليم"
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
                <label className="sm:col-span-2">
                  <span className="rep-label">ملاحظات</span>
                  <textarea
                    rows={3}
                    className="rep-control resize-y"
                    value={fields.notes}
                    onChange={(e) =>
                      setFields({ ...fields, notes: e.target.value })
                    }
                  />
                </label>
              </div>
            </RepFormSection>
            <RepFormSection
              title="الدفعات الأولية"
              description="اختياري — يمكن إنشاء الطلب دون دفعة"
              action={
                <button
                  type="button"
                  onClick={() => setPayments([...payments, emptyPayment()])}
                  className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-black text-brand hover:bg-brand-100"
                >
                  + إضافة دفعة
                </button>
              }
            >
              <div className="space-y-4">
                {payments.length === 0 && (
                  <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-5 text-center text-sm text-stone-500">
                    لا توجد دفعات أولية.
                  </p>
                )}
                {payments.map((payment, index) => (
                  <div
                    key={payment.key}
                    className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 sm:grid-cols-2"
                  >
                    <Field
                      label="المبلغ"
                      type="number"
                      value={payment.amount}
                      onChange={(value) =>
                        setPayments(
                          payments.map((item, i) =>
                            i === index ? { ...item, amount: value } : item,
                          ),
                        )
                      }
                    />
                    <RepSelect
                      label="طريقة الدفع"
                      value={payment.payment_method}
                      options={[
                        { value: "Cash", label: "نقدًا" },
                        { value: "Check", label: "شيك" },
                      ]}
                      onChange={(value) =>
                        setPayments(
                          payments.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  payment_method: value,
                                  check_number: "",
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    {payment.payment_method === "Check" && (
                      <Field
                        label="رقم الشيك *"
                        value={payment.check_number}
                        onChange={(value) =>
                          setPayments(
                            payments.map((item, i) =>
                              i === index
                                ? { ...item, check_number: value }
                                : item,
                            ),
                          )
                        }
                      />
                    )}
                    <Field
                      label="ملاحظات الدفعة"
                      value={payment.notes}
                      onChange={(value) =>
                        setPayments(
                          payments.map((item, i) =>
                            i === index ? { ...item, notes: value } : item,
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPayments(payments.filter((_, i) => i !== index))
                      }
                      className="justify-self-start text-xs font-bold text-red-600"
                    >
                      حذف الدفعة
                    </button>
                  </div>
                ))}
              </div>
            </RepFormSection>
          </div>
          <aside className="space-y-4 xl:sticky xl:top-6">
            <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_16px_40px_-30px_rgba(22,46,33,.5)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-black text-brand">ملخص الطلب</h2>
                <div className="flex items-center gap-2"><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-black text-brand">{items.length} أصناف</span><button type="button" onClick={() => setConfirmClearCart(true)} className="rounded-lg px-2.5 py-1 text-xs font-black text-red-600 hover:bg-red-50">مسح السلة</button></div>
              </div>
              <div className="mt-4 divide-y">
                {items.map((item) => (
                  <article key={item.product_variant_id} className="py-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <strong className="text-sm text-brand">
                          {item.product_name}
                        </strong>
                        <p className="text-xs text-stone-500">
                          {item.size} — {item.color}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItemToRemove({
                            id: item.product_variant_id,
                            name: item.product_name,
                          })
                        }
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-black text-gold-dark">
                        {formatMoney(
                          Math.max(
                            0,
                            Number(item.display_price) -
                              Number(item.display_discount),
                          ),
                        )}
                      </span>
                      <QuantityInput value={item.quantity} max={item.last_known_stock} onChange={(quantity) => updateQuantity(item.product_variant_id, quantity)} showStock={showWholesaleStock} />
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-4 flex justify-between border-t pt-4">
                <span className="font-bold text-stone-600">
                  الإجمالي التقديري
                </span>
                <strong className="text-lg text-gold-dark">
                  {formatMoney(previewSubtotal)}
                </strong>
              </div>
            </section>
            <button
              disabled={submitting}
              className="min-h-12 w-full rounded-xl bg-brand px-5 font-black text-white shadow-lg shadow-brand/10 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "جاري إنشاء الطلب…" : "تأكيد وإنشاء الطلب"}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("/rep/products")}
              className="w-full rounded-xl border bg-white py-3 text-sm font-bold text-stone-600 hover:border-brand-200 hover:bg-brand-50"
            >
              إضافة منتجات أخرى
            </button>
          </aside>
        </div>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void createOrder()}
        loading={submitting}
        severity="normal"
        title="تأكيد إنشاء طلب الجملة"
        message="هل أنت متأكد أنك تريد إنشاء هذا الطلب؟"
        confirmLabel="إنشاء الطلب"
        details={
          <div className="space-y-1">
            <p>
              الزبون: <strong>{fields.customer_name}</strong>
            </p>
            <p>
              عدد المنتجات: <strong>{items.length}</strong>
            </p>
            <p>
              الإجمالي التقريبي:{" "}
              <strong>
                {formatMoney(
                  Math.max(
                    0,
                    previewSubtotal - Number(fields.order_discount || 0),
                  ),
                )}
              </strong>
            </p>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmClearCart}
        onClose={() => setConfirmClearCart(false)}
        onConfirm={() => { clearCart(); setConfirmClearCart(false); }}
        severity="destructive"
        title="مسح سلة الجملة"
        message="هل أنت متأكد أنك تريد تفريغ السلة؟ سيتم حذف جميع المنتجات منها."
        confirmLabel="مسح السلة"
      />
      <ConfirmDialog
        open={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove) removeItem(itemToRemove.id);
          setItemToRemove(null);
        }}
        severity="destructive"
        title="إزالة المنتج"
        message={`هل أنت متأكد أنك تريد إزالة "${itemToRemove?.name ?? ""}" من طلب الجملة؟ ستفقد الكمية والخيار المحدد.`}
        confirmLabel="إزالة المنتج"
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
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="rep-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function LookupNote({
  icon,
  text,
  success = false,
}: {
  icon?: React.ReactNode;
  text: string;
  success?: boolean;
}) {
  return (
    <p
      className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${success ? "text-emerald-700" : "text-stone-500"}`}
    >
      {icon}
      {text}
    </p>
  );
}
