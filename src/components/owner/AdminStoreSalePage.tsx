import { useEffect, useState, type FormEvent } from "react";
import { Search, ShoppingBasket, Trash2 } from "lucide-react";
import { customersService, ordersService, type CustomerSelectionDto, type OrderResponseDto } from "@/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RepProductPicker, {
  type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages, formatMoney } from "@/components/rep/repOrderUtils";
import QuantityInput from "@/components/ui/QuantityInput";
import OrderReceipt from "@/components/ui/OrderReceipt";
import { useCustomerCurrentDebt } from "@/components/orders/useCustomerCurrentDebt";
type Item = PickedOrderItem & { display_price: string; isBonus: boolean };
export default function AdminStoreSalePage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerOptions, setCustomerOptions] = useState<CustomerSelectionDto[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [fields, setFields] = useState({
    customer_name: "",
    phone: "",
    email: "",
    order_discount: "",
    notes: "",
  });
  const [picker, setPicker] = useState(false);
  const [pickerBonus, setPickerBonus] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<OrderResponseDto | null>(null);
  const customerDebt = useCustomerCurrentDebt(result?.customer.phone);
  const normalItems = items.filter((item) => !item.isBonus);
  const bonusItems = items.filter((item) => item.isBonus);
  const subtotal = items.reduce((s, i) => s + (i.isBonus ? 0 : Number(i.display_price) * i.quantity), 0);
  const discount = Number(fields.order_discount || 0);
  const estimate = subtotal - discount;
  useEffect(() => {
    const search = customerSearch.trim();
    if (!search || selectedCustomerId !== null) {
      setCustomerOptions([]);
      setSearchingCustomers(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchingCustomers(true);
      customersService.list({ page: 1, limit: 8, search }, controller.signal)
        .then((response) => setCustomerOptions(response.customers))
        .catch(() => { if (!controller.signal.aborted) setCustomerOptions([]); })
        .finally(() => { if (!controller.signal.aborted) setSearchingCustomers(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerSearch, selectedCustomerId]);
  const add = (p: PickedOrderItem, isBonus = false) =>
    setItems((c) => {
      const found = c.find(
        (i) => i.product_variant_id === p.product_variant_id && i.isBonus === isBonus,
      );
      if (found)
        return c.map((i) =>
          i.product_variant_id === p.product_variant_id && i.isBonus === isBonus
            ? { ...i, quantity: Math.min(i.quantity + p.quantity, p.stock) }
            : i,
        );
      return [...c, { ...p, display_price: isBonus ? "0" : p.display_price || "0", isBonus }];
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    if (
      !fields.customer_name.trim() ||
      !fields.phone.trim() ||
      normalItems.length === 0
    ) {
      setErrors([
        "اسم الزبون والهاتف ومنتج واحد على الأقل مطلوبة حسب عقد البيع الحالي.",
      ]);
      return;
    }
    if (items.some((item) => !item.isBonus && (item.display_price === "" || !Number.isFinite(Number(item.display_price)) || Number(item.display_price) < 0))) {
      setErrors(["أدخل سعر بيع صالحًا لكل منتج."]);
      return;
    }
    if (items.some((item) => items.filter((entry) => entry.product_variant_id === item.product_variant_id).reduce((sum, entry) => sum + entry.quantity, 0) > item.stock)) {
      setErrors(["إجمالي الكمية العادية والبونص يتجاوز المخزون المتاح لأحد الخيارات."]);
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      setErrors(["خصم الطلب يجب أن يكون رقمًا صحيحًا وألا يتجاوز مجموع المنتجات."]);
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
          // The API subtracts the catalog item discount after this value;
          // add it back so the edited field remains the final selling price.
          unit_price: i.isBonus ? 0 : Number(i.display_price) + Number(i.display_discount || 0),
          is_bonus: i.isBonus,
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
              setCustomerSearch("");
              setSelectedCustomerId(null);
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
              <button type="button" onClick={() => { setPickerBonus(false); setPicker(true); }} className="rounded-xl bg-brand px-4 py-2 font-black text-white">+ إضافة منتج</button>
            </div>
            {normalItems.length === 0 ? (
              <p className="mt-5 rounded-xl bg-stone-50 p-8 text-center text-sm text-stone-500">
                لم تتم إضافة منتجات.
              </p>
            ) : (
              <div className="mt-4 divide-y">
                {normalItems.map((i) => (
                  <div
                    key={`${i.product_variant_id}-${i.isBonus}`}
                    className="grid items-center gap-4 py-4 md:grid-cols-[minmax(0,1fr)_160px_182px_44px]"
                  >
                    <div className="min-w-0">
                      <b>{i.label}</b>{i.isBonus && <span className="mr-2 rounded-full bg-gold/20 px-2 py-1 text-xs font-black text-brand">بونص</span>}
                      <p className="text-xs text-stone-500">المخزون المعروف {i.stock}</p>
                      <button type="button" className="mt-1 text-xs font-bold text-gold-dark" onClick={() => { if (!items.some((entry) => entry.product_variant_id === i.product_variant_id && entry.isBonus !== i.isBonus)) setItems((current) => [...current, { ...i, quantity: 1, isBonus: !i.isBonus, display_price: !i.isBonus ? "0" : (i.display_price || i.original_price || "0") }]); }}>{i.isBonus ? "إضافة كسطر عادي" : "إضافة نفس الخيار كبونص"}</button>
                    </div>
                    <label className="block">
                        <span className="rep-label">سعر البيع</span>
                        <input className="rep-control" type="number" min="0" step="0.01" disabled={i.isBonus} value={i.isBonus ? "0" : i.display_price} onChange={(event) => setItems((current) => current.map((entry) => entry.product_variant_id === i.product_variant_id && entry.isBonus === i.isBonus ? { ...entry, display_price: event.target.value } : entry))} />
                    </label>
                    <label className="block">
                      <span className="rep-label">الكمية</span>
                      <QuantityInput value={i.quantity} max={i.stock} onChange={(quantity) => setItems((current) => current.map((entry) => entry.product_variant_id === i.product_variant_id && entry.isBonus === i.isBonus ? { ...entry, quantity } : entry))} />
                    </label>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((c) =>
                            c.filter(
                              (x) =>
                                x.product_variant_id !== i.product_variant_id || x.isBonus !== i.isBonus,
                            ),
                          )
                        }
                        className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                        aria-label={`حذف ${i.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-black text-brand">أصناف البونص</h2><p className="text-xs text-stone-500">اختياري — يمكن اختيار أي صنف كبونص حتى لو لم يكن ضمن أصناف البيع.</p></div>
              <button type="button" onClick={() => { setPickerBonus(true); setPicker(true); }} className="rounded-lg bg-gold/15 px-3 py-2 text-xs font-black text-brand hover:bg-gold/25">+ اختيار صنف بونص</button>
            </div>
            {bonusItems.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-5 text-center text-sm text-stone-500">لا توجد أصناف بونص.</p> : <div className="mt-4 space-y-3">{bonusItems.map((item) => <div key={`bonus-${item.product_variant_id}`} className="grid items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:grid-cols-[1fr_182px_auto]"><div><b className="text-sm text-brand">{item.label}</b><p className="mt-1 text-xs font-bold text-gold-dark">بونص · السعر صفر</p></div><QuantityInput value={item.quantity} max={item.stock} onChange={(quantity) => setItems((current) => current.map((entry) => entry.product_variant_id === item.product_variant_id && entry.isBonus ? { ...entry, quantity } : entry))}/><button type="button" className="justify-self-end rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setItems((current) => current.filter((entry) => entry.product_variant_id !== item.product_variant_id || !entry.isBonus))} aria-label="حذف صنف البونص"><Trash2 className="h-5 w-5"/></button></div>)}</div>}
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-black text-brand">بيانات البيع</h2>
            <div className="relative mt-4">
              <label className="rep-label">البحث عن زبون موجود</label>
              <Search className="absolute right-3 top-10 h-4 w-4 text-stone-400" />
              <input className="rep-control pr-10" value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setSelectedCustomerId(null); }} placeholder="ابحث بالاسم أو رقم الهاتف" autoComplete="off" />
              {(searchingCustomers || customerOptions.length > 0) && <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl">
                {searchingCustomers ? <p className="p-3 text-sm text-stone-500">جاري البحث…</p> : customerOptions.map((customer) => <button key={customer.customer_id} type="button" className="block w-full rounded-lg px-3 py-2 text-right hover:bg-stone-50" onClick={() => { setFields((current) => ({ ...current, customer_name: customer.name, phone: customer.phone, email: customer.email ?? "" })); setSelectedCustomerId(customer.customer_id); setCustomerSearch(`${customer.name} — ${customer.phone}`); setCustomerOptions([]); }}><b className="block text-brand">{customer.name}</b><span className="text-xs text-stone-500">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</span></button>)}
              </div>}
              <p className="mt-1 text-xs text-stone-500">اختر الزبون لتعبئة بياناته، أو أدخل بيانات زبون جديد أدناه.</p>
            </div>
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
            <span>مجموع المنتجات</span>
            <b>{formatMoney(subtotal)}</b>
          </p>
          <p className="mt-3 flex justify-between text-red-700">
            <span>خصم كامل الطلب</span>
            <b>- {formatMoney(discount)}</b>
          </p>
          <p className="mt-3 flex justify-between border-t pt-3 text-lg">
            <span className="font-black">الإجمالي النهائي</span>
            <b className="text-gold-dark">
              {formatMoney(Math.max(0, estimate))}
            </b>
          </p>
          <p className="mt-4 text-xs text-stone-500">يمكن تعديل سعر كل صنف، ثم يطبّق خصم الطلب على المجموع النهائي.</p>
          <button
            disabled={submitting || normalItems.length === 0}
            className="mt-5 min-h-12 w-full rounded-xl bg-brand font-black text-white disabled:opacity-50"
          >
            تسجيل البيع
          </button>
        </aside>
      </form>
      <RepProductPicker
        open={picker}
        existing={items.filter((item) => item.isBonus === pickerBonus)}
        onClose={() => setPicker(false)}
        onAdd={(item) => { add(item, pickerBonus); setPicker(false); }}
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
