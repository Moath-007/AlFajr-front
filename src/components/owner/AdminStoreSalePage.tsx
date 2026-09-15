import { useState, type FormEvent } from "react";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { ordersService, type OrderResponseDto } from "@/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RepProductPicker, {
  type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages, formatMoney } from "@/components/rep/repOrderUtils";
import QuantityInput from "@/components/ui/QuantityInput";
import OrderReceipt from "@/components/ui/OrderReceipt";
import { useCustomerCurrentDebt } from "@/components/orders/useCustomerCurrentDebt";
type Item = PickedOrderItem & { display_price: string };
export default function AdminStoreSalePage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [fields, setFields] = useState({
    customer_name: "",
    phone: "",
    email: "",
    order_discount: "",
    notes: "",
  });
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<OrderResponseDto | null>(null);
  const customerDebt = useCustomerCurrentDebt(result?.customer.phone);
  const estimate =
    items.reduce((s, i) => s + Number(i.display_price) * i.quantity, 0) -
    Number(fields.order_discount || 0);
  const add = (p: PickedOrderItem) =>
    setItems((c) => {
      const found = c.find(
        (i) => i.product_variant_id === p.product_variant_id,
      );
      if (found)
        return c.map((i) =>
          i.product_variant_id === p.product_variant_id
            ? { ...i, quantity: Math.min(i.quantity + p.quantity, p.stock) }
            : i,
        );
      return [...c, { ...p, display_price: p.display_price || "0" }];
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    if (
      !fields.customer_name.trim() ||
      !fields.phone.trim() ||
      items.length === 0
    ) {
      setErrors([
        "اسم الزبون والهاتف ومنتج واحد على الأقل مطلوبة حسب عقد البيع الحالي.",
      ]);
      return;
    }
    setConfirm(true);
  };
  const create = async () => {
    setSubmitting(true);
    try {
      const r = await ordersService.createStoreSale({
        customer_name: fields.customer_name.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        order_discount: fields.order_discount
          ? Number(fields.order_discount)
          : undefined,
        notes: fields.notes.trim() || undefined,
        items: items.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
        })),
      });
      setConfirm(false);
      setResult((await ordersService.getById(r.order.order_id)).order);
      setItems([]);
    } catch (e) {
      setConfirm(false);
      setErrors(apiMessages(e, "تعذر تسجيل بيع المحل."));
    } finally {
      setSubmitting(false);
    }
  };
  if (result)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center">
        <ShoppingBasket className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-black text-brand">
          تم تسجيل البيع بنجاح
        </h1>
        <p className="mt-2">الطلب #{result.id}</p>
        <strong className="mt-3 block text-xl text-gold-dark">
          {formatMoney(result.total_amount)}
        </strong>
        <div className="mt-5 flex justify-center"><OrderReceipt order={result} customerCurrentDebt={customerDebt.debt} customerDebtLoading={customerDebt.loading} customerDebtFailed={customerDebt.failed} /></div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setResult(null);
              setFields({
              customer_name: "",
              phone: "",
                email: "",
                order_discount: "",
                notes: "",
              });
            }}
            className="btn-primary"
          >
            بيع جديد
          </button>
          <button
            onClick={() => onNavigate(`/owner/orders/${result.id}`)}
            className="btn-outline"
          >
            عرض الطلب
          </button>
        </div>
      </div>
    );
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">بيع مباشر</p>
        <h1 className="mt-1 text-3xl font-black text-brand">بيع من المحل</h1>
        <p className="mt-2 text-sm text-stone-500">
          يستخدم النظام أسعار الأونلاين ويسجل البيع مكتملًا ومدفوعًا نقدًا.
        </p>
      </header>
      {errors.length > 0 && (
        <div className="rep-error">{errors.join("، ")}</div>
      )}
      <form
        onSubmit={submit}
        className="grid items-start gap-6 xl:grid-cols-[1fr_360px]"
      >
        <div className="space-y-5">
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex justify-between">
              <div>
                <h2 className="font-black text-brand">المنتجات</h2>
                <p className="text-xs text-stone-500">
                  اختر المنتج والخيار والكمية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="rounded-xl bg-brand px-4 py-2 font-black text-white"
              >
                + إضافة منتج
              </button>
            </div>
            {items.length === 0 ? (
              <p className="mt-5 rounded-xl bg-stone-50 p-8 text-center text-sm text-stone-500">
                لم تتم إضافة منتجات.
              </p>
            ) : (
              <div className="mt-4 divide-y">
                {items.map((i) => (
                  <div
                    key={i.product_variant_id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <b>{i.label}</b>
                      <p className="text-xs text-stone-500">
                        {Number(i.display_discount || 0) > 0 && <del className="ml-2 text-stone-400">{formatMoney(i.original_price || i.display_price)}</del>}<strong className="text-gold-dark">{formatMoney(i.display_price)}</strong> · المخزون
                        المعروف {i.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <QuantityInput value={i.quantity} max={i.stock} onChange={(quantity) => setItems((current) => current.map((entry) => entry.product_variant_id === i.product_variant_id ? { ...entry, quantity } : entry))} />
                      <button
                        type="button"
                        onClick={() =>
                          setItems((c) =>
                            c.filter(
                              (x) =>
                                x.product_variant_id !== i.product_variant_id,
                            ),
                          )
                        }
                        className="p-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-black text-brand">بيانات البيع</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="اسم الزبون *"
                value={fields.customer_name}
                onChange={(v) => setFields({ ...fields, customer_name: v })}
              />
              <Field
                label="الهاتف *"
                value={fields.phone}
                onChange={(v) => setFields({ ...fields, phone: v })}
              />
              <Field
                label="البريد"
                value={fields.email}
                onChange={(v) => setFields({ ...fields, email: v })}
              />
              <Field
                label="خصم الطلب"
                type="number"
                value={fields.order_discount}
                onChange={(v) => setFields({ ...fields, order_discount: v })}
              />
              <Field
                label="ملاحظات"
                value={fields.notes}
                onChange={(v) => setFields({ ...fields, notes: v })}
              />
            </div>
          </section>
        </div>
        <aside className="rounded-2xl border bg-white p-5 xl:sticky xl:top-5">
          <h2 className="font-black text-brand">ملخص البيع</h2>
          <p className="mt-4 flex justify-between">
            <span>عدد الأصناف</span>
            <b>{items.length}</b>
          </p>
          <p className="mt-3 flex justify-between">
            <span>الإجمالي التقديري</span>
            <b className="text-gold-dark">
              {formatMoney(Math.max(0, estimate))}
            </b>
          </p>
          <p className="mt-4 text-xs text-stone-500">
            السعر النهائي والدفع النقدي يحسبهما الباك.
          </p>
          <button
            disabled={submitting || items.length === 0}
            className="mt-5 min-h-12 w-full rounded-xl bg-brand font-black text-white disabled:opacity-50"
          >
            تسجيل البيع
          </button>
        </aside>
      </form>
      <RepProductPicker
        open={picker}
        existing={items}
        onClose={() => setPicker(false)}
        onAdd={add}
        priceMode="retail"
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void create()}
        loading={submitting}
        severity="normal"
        title="تأكيد بيع المحل"
        message={`تسجيل بيع نقدي مباشر يحتوي ${items.length} أصناف؟`}
        confirmLabel="تسجيل البيع"
      />
    </div>
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
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="rep-label">{label}</span>
      <input
        className="rep-control"
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
