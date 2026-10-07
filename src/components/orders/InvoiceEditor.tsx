import {
ordersService,
type OrderResponseDto,
} from "@/api";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import RepProductPicker,{
type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages,formatMoney } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import QuantityInput from "@/components/ui/QuantityInput";
import { Check,Gift,Loader2,PackageOpen,Plus,Trash2 } from "lucide-react";
import { useEffect,useRef,useState,type FormEvent } from "react";
import GeneralSaleAccountSelect from "./GeneralSaleAccountSelect";
import "./InvoiceEditor.css";
import { canEditOrder } from "./orderEditPermission";
import { usePaginatedSaleAccounts } from "./usePaginatedSaleAccounts";
export type InvoiceDraftItem = PickedOrderItem & {
  price: string;
  discount: string;
  bonus: boolean;
};
type Reference = {
  contact: string;

  address: string;
  notes: string;
  discount: string;
};
const emptyReference: Reference = {
  contact: "",

  address: "",
  notes: "",
  discount: "0",
};
const moneyValid = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value);
export default function InvoiceEditor({
  orderId,
  mode,
  defaultPrice,
  onNavigate,
  onDirtyChange,
  initialItems = [],
  onCreated,
}: {
  orderId?: number;
  mode: "admin" | "representative";
  defaultPrice: "retail" | "wholesale";
  onNavigate: (path: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialItems?: InvoiceDraftItem[];
  onCreated?: () => void;
}) {
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [items, setItems] = useState<InvoiceDraftItem[]>(initialItems);
  const [fields, setFields] = useState<Reference>(emptyReference);
  const [account, setAccount] = useState<number | null>(null);
  const [priceMode, setPriceMode] = useState(defaultPrice);
  const [picker, setPicker] = useState<"normal" | "bonus" | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const baseline = useRef(
    JSON.stringify({
      items: initialItems,
      fields: emptyReference,
      account: null,
    }),
  );
  const lock = useRef(false);
  const errorRegion = useRef<HTMLDivElement>(null);
  const summarySection = useRef<HTMLElement>(null);
  const accounts = usePaginatedSaleAccounts(true, order?.sale_account?.kind === 'General' ? order.sale_account : null);
  const snapshot = JSON.stringify({ items, fields, account });
  const path = mode === "admin" ? "/owner/orders" : "/rep/orders";
  useEffect(() => {
    const controller = new AbortController();
    if (!orderId) return;
    setLoading(true);
    setOrder(null);
    setError("");
    ordersService
      .getById(orderId, controller.signal)
      .then(({ order: row }) => {
        if (controller.signal.aborted) return;
        const refs: Reference = {
          contact: row.contact_text ?? "",
          address: row.delivery_address ?? "",
          notes: row.notes ?? "",
          discount: row.order_discount,
        };
        const lines = row.items.map((i) => ({
          product_variant_id: i.variant.id,
          quantity: i.quantity,
          label: `${i.variant.product.name} — ${i.variant.size} — ${i.variant.color.name}`,
          stock: 0,
          price: i.unit_price,
          discount: i.product_discount,
          bonus: i.is_bonus,
        }));
        setOrder(row);
        setFields(refs);
        setItems(lines);
        setAccount(row.sale_account_id);
        baseline.current = JSON.stringify({
          items: lines,
          fields: refs,
          account: row.sale_account_id,
        });
        setError("");
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
  useEffect(() => {
    onDirtyChange?.(Boolean(baseline.current && baseline.current !== snapshot));
    return () => onDirtyChange?.(false);
  }, [snapshot, onDirtyChange]);
  useEffect(() => {
    if (!error) return;
    errorRegion.current?.focus({ preventScroll: true });
    errorRegion.current?.scrollIntoView({ block: "start" });
  }, [error]);
  const editable =
    !orderId ||
    Boolean(
      order &&
      canEditOrder(order, mode === "admin" ? "Admin" : "Representative"),
    );
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.price) - Number(i.discount)) * i.quantity,
    0,
  );
  const add = (item: PickedOrderItem) => {
    const bonus = picker === "bonus";
    setItems((current) => {
      const existing = current.find(
        (i) =>
          i.product_variant_id === item.product_variant_id && i.bonus === bonus,
      );
      return existing
        ? current.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + item.quantity } : i,
        )
        : [
          ...current,
          {
            ...item,
            price: bonus
              ? "0"
              : (item.original_price ?? item.display_price ?? "0"),
            discount: bonus ? "0" : (item.display_discount ?? "0"),
            bonus,
          },
        ];
    });
  };
  const patchItem = (index: number, patch: Partial<InvoiceDraftItem>) =>
    setItems((current) =>
      current.map((i, n) => (n === index ? { ...i, ...patch } : i)),
    );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!editable || lock.current) return;
    if (
      !items.length ||
      items.some(
        (i) =>
          !Number.isSafeInteger(i.quantity) ||
          i.quantity < 1 ||
          !moneyValid(i.price) ||
          !moneyValid(i.discount) ||
          Number(i.discount) > Number(i.price),
      )
    ) {
      setError("راجع البنود والكميات والأسعار والخصومات (منزلتان عشريتان).");
      return;
    }
    if (!moneyValid(fields.discount) || Number(fields.discount) > subtotal) {
      setError("خصم الفاتورة يتجاوز قيمة البنود أو غير صالح.");
      return;
    }
    if (
      (!order || order.status === "Completed") &&
      (account === null || !accounts.accounts.some((a) => a.id === account))
    ) {
      setError("اختر حساب البيع.");
      return;
    }
    setConfirm(true);
  };
  const save = async () => {
    if (lock.current || !editable) return;
    lock.current = true;
    setSaving(true);
    const data = {
      contact_text: fields.contact.trim() || null,
      delivery_address: fields.address.trim() || null,
      notes: fields.notes.trim() || null,
      order_discount: Number(fields.discount),
      items: items.map((i) => ({
        product_variant_id: i.product_variant_id,
        quantity: i.quantity,
        unit_price: Number(i.price),
        product_discount: Number(i.discount),
        is_bonus: i.bonus,
      })),
    };
    try {
      const result = orderId
        ? await ordersService.update(orderId, {
          ...data,
          ...(account !== null ? { sale_account_id: account } : {}),
        })
        : await ordersService.createInvoice({
          ...data,
          sale_account_id: account!,
        });
      baseline.current = snapshot;
      onDirtyChange?.(false);
      if (!orderId) onCreated?.();
      onNavigate(`${path}/${result.order.order_id}`);
    } catch (e) {
      setError(apiMessages(e, "تعذر حفظ الفاتورة").join("، "));
      setConfirm(false);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  if (loading) return (
    <div role="status" className="rep-section flex min-h-64 items-center justify-center gap-3 text-sm text-stone-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />جاري تحميل الفاتورة…
    </div>
  );
  if (orderId && !order) return (
    <div role="alert" className="rep-error flex flex-wrap items-center gap-3">
      <span>{error}</span>
      <button className="btn-outline" onClick={() => setRetry((n) => n + 1)}>إعادة المحاولة</button>
      <button className="btn-ghost" onClick={() => onNavigate(path)}>رجوع للفواتير</button>
    </div>
  );
  return (
    <form onSubmit={submit} className="invoice-editor min-w-0 space-y-5" dir="rtl">
      <header className="rep-page-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-brand">
              {orderId ? <>تعديل الفاتورة <bdi>#{orderId}</bdi></> : "إنشاء فاتورة بيع"}
            </h1>
            {order && <OrderStatusBadge status={order.status} />}
          </div>
          <p className="rep-subtitle">راجع بيانات الفاتورة والمنتجات، ثم احفظ التغييرات.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {items.length > 5 && <button type="button" className="btn-outline" onClick={() => { summarySection.current?.focus({ preventScroll: true }); summarySection.current?.scrollIntoView({ block: "start" }); }}>الإجمالي والحفظ</button>}
          <button type="button" className="btn-outline" disabled={saving} onClick={() => onNavigate(orderId ? `${path}/${orderId}` : path)}>{orderId ? "رجوع للتفاصيل" : "رجوع للفواتير"}</button>
        </div>
      </header>
      {error && <div ref={errorRegion} tabIndex={-1} role="alert" className="rep-error scroll-mt-24 outline-none">{error}</div>}
      {!editable && <p role="alert" className="rep-error">هذه الفاتورة غير قابلة للتعديل.</p>}
      <fieldset disabled={!editable || saving} className="min-w-0 space-y-5">
        <section className="rep-section">
          <div className={"border-b border-stone-100 px-4 py-3"}><h2 className={"text-sm font-bold text-brand"}>بيانات الفاتورة</h2></div>
          <div className={"grid min-w-0 items-start gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"}>
            <div className={"min-w-0"}>
              <GeneralSaleAccountSelect floating {...accounts} onRetry={accounts.reload} value={account} onChange={setAccount}
                label={order?.status === "Pending" ? "حساب البيع (يُطلب عند التأكيد)" : "حساب البيع *"} />
            </div>
            <label className="min-w-0"><span className="rep-label">بيانات التواصل</span>
              <textarea className="rep-control block resize-y leading-6" rows={2} value={fields.contact}
                placeholder="اسم جهة التواصل أو الهاتف أو أي مرجع للفاتورة"
                onChange={(e) => setFields((f) => ({ ...f, contact: e.target.value }))} />
            </label>
            <label className="min-w-0"><span className="rep-label">عنوان التسليم</span>
              <textarea className="rep-control block resize-y leading-6" rows={2} value={fields.address} maxLength={255}
                placeholder="العنوان، إن وجد" onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))} />
            </label>
            <label className={"min-w-0"}><span className="rep-label">ملاحظات الفاتورة</span>
              <textarea className="rep-control block resize-y leading-6" rows={2} value={fields.notes}
                placeholder="ملاحظات إضافية، إن وجدت" onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))} />
            </label>
          </div>
        </section>
        <div className={`grid min-w-0 items-start gap-5 ${"2xl:grid-cols-[minmax(0,1fr)_300px]"}`}>
          <section className="rep-section min-w-0">
            <div className="rep-section-heading"><h2>المنتجات والكميات <span className="text-sm font-normal text-stone-500">({items.length})</span></h2><p>عدّل كمية كل منتج وسعره وخصمه بشكل مستقل.</p></div>
            <div className="border-b border-stone-100 p-4 sm:p-5">
              <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">{<fieldset>
                  <legend className="rep-label">سعر المنتجات الجديدة</legend>
                  <div className="inline-flex gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">
                    {([{ value: "retail", label: "مفرق" }, { value: "wholesale", label: "جملة" }] as const).map(option => <label key={option.value} className="relative cursor-pointer">
                      <input type="radio" name="new-product-price" value={option.value} checked={priceMode === option.value}
                        disabled={!editable || saving} onChange={() => setPriceMode(option.value)} className="peer sr-only" />
                      <span className="flex min-h-11 min-w-20 items-center justify-center rounded-lg px-4 text-sm font-bold text-stone-600 transition-colors duration-150 hover:bg-white/70 peer-checked:bg-brand peer-checked:text-white peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold peer-disabled:cursor-not-allowed peer-disabled:opacity-50">{option.label}</span>
                    </label>)}
                  </div>
                </fieldset>}

                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button type="button" className="btn-primary" onClick={() => setPicker("normal")}><Plus className="h-4 w-4" aria-hidden />إضافة منتج</button>
                  <button type="button" className="btn-outline" onClick={() => setPicker("bonus")}><Gift className="h-4 w-4" aria-hidden />إضافة بونص</button>
                </div>
              </div>
            </div>
            {!items.length && <div className="flex flex-col items-center gap-3 px-4 py-12 text-center"><PackageOpen className="h-8 w-8 text-stone-400" aria-hidden /><p className="font-bold text-brand">لم تُضف منتجات بعد</p><p className="text-sm text-stone-500">أضف منتجاً أو بونص لبدء الفاتورة.</p></div>}
            {items.length > 0 && <table className="invoice-edit-items" aria-label="تعديل المنتجات والكميات">
              <colgroup><col /><col className="edit-quantity-column" /><col className="edit-money-column" /><col className="edit-money-column" /><col className="edit-bonus-column" /><col className="edit-total-column" /><col className="edit-remove-column" /></colgroup>
              <thead><tr>{["المنتج", "الكمية", "سعر الوحدة (₪)", "خصم الوحدة (₪)", "بونص", "القيمة", "إزالة"].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
              <tbody>{items.map((item, index) => <tr key={`${item.product_variant_id}:${item.bonus}`} aria-label={`المنتج ${index + 1}`}>
                <td className="edit-product-cell"><div className="flex items-start gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs text-stone-500" aria-hidden>{index + 1}</span><span className="min-w-0 break-words font-bold leading-6 text-brand">{item.label}</span></div></td>
                <td><span className="edit-mobile-label">الكمية</span><QuantityInput value={item.quantity} ariaLabel={`كمية المنتج ${index + 1}`} onChange={(quantity) => patchItem(index, { quantity })} /></td>
                <td><label><span className="edit-mobile-label">سعر الوحدة (₪)</span><input aria-label={`سعر الوحدة للمنتج ${index + 1}`} className="rep-control tabular-nums" type="number" inputMode="decimal" min="0" step="0.01" disabled={item.bonus} value={item.price} onChange={(e) => patchItem(index, { price: e.target.value })} /></label></td>
                <td><label><span className="edit-mobile-label">خصم الوحدة (₪)</span><input aria-label={`خصم الوحدة للمنتج ${index + 1}`} className="rep-control tabular-nums" type="number" inputMode="decimal" min="0" step="0.01" disabled={item.bonus} value={item.discount} onChange={(e) => patchItem(index, { discount: e.target.value })} /></label></td>
                <td className="edit-bonus-cell"><label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2">
                  <input type="checkbox" className="peer sr-only" aria-label={`بونص للمنتج ${index + 1}`} checked={item.bonus} onChange={(e) => {
                    if (items.some((i, n) => n !== index && i.product_variant_id === item.product_variant_id && i.bonus === e.target.checked)) { setError("يوجد سطر بهذه الحالة؛ ادمج الكمية أولًا."); return; }
                    patchItem(index, { bonus: e.target.checked, ...(e.target.checked ? { price: "0", discount: "0" } : {}) });
                  }} />
                  <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-stone-300 bg-white transition-colors hover:border-brand peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold peer-disabled:opacity-50">{item.bonus && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}</span><span className="lg:sr-only text-sm font-bold">بونص</span>
                </label></td>
                <td className="edit-value-cell"><span className="edit-mobile-label">القيمة</span><b className="tabular-nums text-brand">{formatMoney((Number(item.price) - Number(item.discount)) * item.quantity)}</b></td>
                <td className="edit-remove-cell"><button type="button" className="btn-ghost min-h-11 text-red-700 hover:bg-red-50" aria-label={`إزالة المنتج ${index + 1}`} onClick={() => setItems((c) => c.filter((_, n) => n !== index))}><Trash2 className="h-4 w-4" aria-hidden /><span className="lg:sr-only">إزالة</span></button></td>
              </tr>)}</tbody>
            </table>}
          </section>
          <section ref={summarySection} tabIndex={-1} className={`rep-section scroll-mt-24 outline-none ${"2xl:sticky 2xl:top-24"}`}>
            <div className="rep-section-heading"><h2>الإجمالي والحفظ</h2><p>راجع الخصم والإجمالي قبل الحفظ.</p></div>
            <div className="space-y-5 p-4 sm:p-5">
              <p className="flex flex-wrap justify-between gap-2 text-sm text-stone-500">مجموع المنتجات<b className="text-brand">{formatMoney(subtotal)}</b></p>
              <label className="block"><span className="rep-label">خصم الفاتورة (₪)</span><input className="rep-control tabular-nums" type="number" inputMode="decimal" min="0" step="0.01" value={fields.discount} onChange={(e) => setFields((f) => ({ ...f, discount: e.target.value }))} /></label>
              <div className="border-t border-stone-100 pt-4"><p className="text-xs text-stone-500">الإجمالي النهائي · {items.length} منتج</p><p className="mt-2 text-2xl font-black tabular-nums text-brand" aria-live="polite">{formatMoney(subtotal - Number(fields.discount))}</p></div>
              <button className="btn-primary min-h-11 w-full" disabled={saving || accounts.loading}>{saving ? "جاري الحفظ…" : orderId ? "حفظ التعديل" : "إنشاء الفاتورة"}</button>
            </div>
          </section>
        </div>
      </fieldset>
      <RepProductPicker
        open={picker !== null}
        existing={items.filter((i) => i.bonus === (picker === "bonus"))}
        priceMode={priceMode}
        onClose={() => setPicker(null)}
        onAdd={add}
      />
      <ConfirmDialog
        severity="normal"
        open={confirm}
        title="حفظ الفاتورة"
        message={
          order?.status === "Pending"
            ? "سيتم حفظ المسودة دون أثر مالي أو مخزني."
            : "سيتم حفظ الفاتورة وتحديث المخزون والحساب المختار."
        }
        confirmLabel="حفظ"
        loading={saving}
        onConfirm={() => void save()}
        onClose={() => {
          if (!saving) setConfirm(false);
        }}
      />
    </form>
  );
}
