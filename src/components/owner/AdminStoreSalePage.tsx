import { useRef, useState, type FormEvent } from "react";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { ordersService, type OrderResponseDto } from "@/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RepProductPicker, {
  type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages, formatMoney } from "@/components/rep/repOrderUtils";
import QuantityInput from "@/components/ui/QuantityInput";
import OrderReceipt from "@/components/ui/OrderReceipt";
import GeneralSaleAccountSelect from "@/components/orders/GeneralSaleAccountSelect";
import { useGeneralSaleAccounts } from "@/components/orders/useGeneralSaleAccounts";
type Item = PickedOrderItem & { display_price: string; isBonus: boolean };
export default function AdminStoreSalePage({
  onNavigate,
  mode,
}: {
  onNavigate: (p: string) => void;
  mode: "retail" | "wholesale";
}) {
  const saleLabel = mode === "retail" ? "بيع مفرق" : "بيع جملة";
  const [items, setItems] = useState<Item[]>([]);
  const [fields, setFields] = useState({
    order_discount: "",
    notes: "",
  });
  const [picker, setPicker] = useState(false);
  const [pickerBonus, setPickerBonus] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<OrderResponseDto | null>(null);
  const [saleAccountId, setSaleAccountId] = useState<number | null>(null);
  const saleAccounts = useGeneralSaleAccounts();
  const normalItems = items.filter((item) => !item.isBonus);
  const bonusItems = items.filter((item) => item.isBonus);
  const subtotal = items.reduce((s, i) => s + (i.isBonus ? 0 : Number(i.display_price) * i.quantity), 0);
  const discount = Number(fields.order_discount || 0);
  const estimate = subtotal - discount;
  const add = (p: PickedOrderItem, isBonus = false) =>
    setItems((c) => {
      const found = c.find(
        (i) => i.product_variant_id === p.product_variant_id && i.isBonus === isBonus,
      );
      if (found)
        return c.map((i) =>
          i.product_variant_id === p.product_variant_id && i.isBonus === isBonus
            ? { ...i, quantity: i.quantity + p.quantity }
            : i,
        );
      return [...c, { ...p, display_price: isBonus ? "0" : p.display_price || "0", isBonus }];
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submissionLock.current) return;
    setErrors([]);
    if (saleAccountId === null || !saleAccounts.accounts.some((account) => account.id === saleAccountId)) {
      setErrors(["اختر حسابًا لتسجيل الفاتورة."]);
      return;
    }
    if (normalItems.length === 0) {
      setErrors(["أضف منتجًا واحدًا على الأقل لإنشاء الطلب."]);
      return;
    }
    if (items.some((item) => !item.isBonus && (item.display_price === "" || !Number.isFinite(Number(item.display_price)) || Number(item.display_price) < 0))) {
      setErrors(["أدخل سعر بيع صالحًا لكل منتج."]);
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
      setErrors(["خصم الطلب يجب أن يكون رقمًا صحيحًا وألا يتجاوز مجموع المنتجات."]);
      return;
    }
    setConfirm(true);
  };
  const create = async () => {
    if (submissionLock.current) return;
    if (saleAccountId === null || !saleAccounts.accounts.some((account) => account.id === saleAccountId)) {
      setErrors(["اختر حسابًا لتسجيل الفاتورة."]);
      setConfirm(false);
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const r = await ordersService.createStoreSale({
        sale_type: mode === "retail" ? "Retail" : "Wholesale",
        sale_account_id: saleAccountId,
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
      setItems([]);
      try {
        setResult((await ordersService.getById(r.order.order_id)).order);
      } catch {
        onNavigate(`/owner/orders/${r.order.order_id}`);
      }
    } catch (e) {
      setConfirm(false);
      setErrors(apiMessages(e, `تعذر إنشاء طلب ${saleLabel}.`));
    } finally {
      setSubmitting(false);
      submissionLock.current = false;
    }
  };
  if (result)
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center">
        <ShoppingBasket className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-black text-brand">
          تم إنشاء طلب {saleLabel} بنجاح
        </h1>
        <p className="mt-2">الطلب #{result.id}</p>
        <strong className="mt-3 block text-xl text-gold-dark">
          {formatMoney(result.total_amount)}
        </strong>
        <div className="mt-5 flex justify-center"><OrderReceipt order={result} /></div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setResult(null);
              setFields({
                order_discount: "",
                notes: "",
              });
              setSaleAccountId(null);
            }}
            className="btn-primary"
          >
            طلب جديد
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
        <p className="text-xs font-black text-gold-dark">إنشاء طلب</p>
        <h1 className="mt-1 text-3xl font-black text-brand">{saleLabel}</h1>
        <p className="mt-2 text-sm text-stone-500">
          يعرض أسعار {mode === "retail" ? "المفرق" : "الجملة"} ويسجل الطلب على الحساب المختار. سجّل القبض بسند مستقل عند استلام المال.
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
                      <QuantityInput value={i.quantity} max={Number.MAX_SAFE_INTEGER} onChange={(quantity) => setItems((current) => current.map((entry) => entry.product_variant_id === i.product_variant_id && entry.isBonus === i.isBonus ? { ...entry, quantity } : entry))} />
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
            {bonusItems.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-5 text-center text-sm text-stone-500">لا توجد أصناف بونص.</p> : <div className="mt-4 space-y-3">{bonusItems.map((item) => <div key={`bonus-${item.product_variant_id}`} className="grid items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:grid-cols-[1fr_182px_auto]"><div><b className="text-sm text-brand">{item.label}</b><p className="mt-1 text-xs font-bold text-gold-dark">بونص · السعر صفر</p></div><QuantityInput value={item.quantity} max={Number.MAX_SAFE_INTEGER} onChange={(quantity) => setItems((current) => current.map((entry) => entry.product_variant_id === item.product_variant_id && entry.isBonus ? { ...entry, quantity } : entry))}/><button type="button" className="justify-self-end rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setItems((current) => current.filter((entry) => entry.product_variant_id !== item.product_variant_id || !entry.isBonus))} aria-label="حذف صنف البونص"><Trash2 className="h-5 w-5"/></button></div>)}</div>}
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-black text-brand">بيانات الطلب</h2>
            <div className="mt-4 space-y-4">
              <GeneralSaleAccountSelect accounts={saleAccounts.accounts} value={saleAccountId} onChange={setSaleAccountId} loading={saleAccounts.loading} error={saleAccounts.error} onRetry={saleAccounts.reload} onNavigate={onNavigate} />
              <label className="block"><span className="rep-label">ملاحظات</span><textarea className="rep-control min-h-24" value={fields.notes} onChange={(event) => setFields({ ...fields, notes: event.target.value })} /></label>
            </div>
          </section>
        </div>
        <aside className="rounded-2xl border bg-white p-5 xl:sticky xl:top-5">
          <h2 className="font-black text-brand">ملخص الطلب</h2>
          <div className="mt-4"><Field label="خصم كامل الطلب" type="number" value={fields.order_discount} onChange={(value) => setFields({ ...fields, order_discount: value })} /></div>
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
            disabled={submitting || normalItems.length === 0 || saleAccounts.loading || !!saleAccounts.error || saleAccounts.accounts.length === 0}
            className="mt-5 min-h-12 w-full rounded-xl bg-brand font-black text-white disabled:opacity-50"
          >
            إنشاء الطلب
          </button>
        </aside>
      </form>
      <RepProductPicker
        open={picker}
        allowOutOfStock
        existing={items.filter((item) => item.isBonus === pickerBonus)}
        onClose={() => setPicker(false)}
        onAdd={(item) => { add(item, pickerBonus); setPicker(false); }}
        priceMode={mode}
      />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void create()}
        loading={submitting}
        severity="normal"
        title={`تأكيد إنشاء طلب ${saleLabel}`}
        message={`إنشاء طلب ${saleLabel} يحتوي ${items.length} أصناف على حساب ${saleAccounts.accounts.find((account) => account.id === saleAccountId)?.name ?? "الحساب المختار"} دون قبض تلقائي؟`}
        confirmLabel="إنشاء الطلب"
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
