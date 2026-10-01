import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { ordersService, type OrderResponseDto } from "@/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import QuantityInput from "@/components/ui/QuantityInput";
import { Skeleton } from "@/components/ui/Skeleton";
import RepProductPicker, { type PickedOrderItem } from "./RepProductPicker";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { canEditOrder } from "@/components/orders/orderEditPermission";
import GeneralSaleAccountSelect from "@/components/orders/GeneralSaleAccountSelect";
import { useGeneralSaleAccounts } from "@/components/orders/useGeneralSaleAccounts";

type ItemDraft = PickedOrderItem & {
  finalPrice: string;
  basePrice: string;
  productDiscount: string;
  isBonus: boolean;
};
type Fields = {
  customer_name: string;
  phone: string;
  email: string;
  delivery_address: string;
  notes: string;
  order_discount: string;
};
const emptyFields: Fields = {
  customer_name: "", phone: "", email: "", delivery_address: "", notes: "", order_discount: "0",
};
const decimal = (value: number) => Number(value.toFixed(2));

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
  const detailsPath = mode === "admin" ? `/owner/orders/${orderId}` : `/rep/orders/${orderId}`;
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [saleAccountId, setSaleAccountId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [picker, setPicker] = useState(false);
  const [bonusPicker, setBonusPicker] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const saveLock = useRef(false);
  const initial = useRef("");
  const saleAccounts = useGeneralSaleAccounts(order?.status === "Completed");
  const snapshot = useMemo(() => JSON.stringify({ fields, items, saleAccountId }), [fields, items, saleAccountId]);
  const dirty = Boolean(order && initial.current && initial.current !== snapshot);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setOrder(null);
    setSaleAccountId(null);
    ordersService.getById(orderId, controller.signal)
      .then(({ order: loaded }) => {
        if (controller.signal.aborted) return;
        const nextFields: Fields = {
          customer_name: loaded.customer?.name ?? "",
          phone: loaded.customer?.phone ?? "",
          email: loaded.customer?.email ?? "",
          delivery_address: loaded.delivery_address ?? "",
          notes: loaded.notes ?? "",
          order_discount: loaded.order_discount,
        };
        const nextItems: ItemDraft[] = loaded.items.map((item) => ({
          product_variant_id: item.variant.id,
          quantity: item.quantity,
          label: `${item.variant.product.name} — ${item.variant.size} — ${item.variant.color.name}`,
          stock: Number.MAX_SAFE_INTEGER,
          finalPrice: item.is_bonus ? "0" : String(decimal(Number(item.unit_price) - Number(item.product_discount))),
          basePrice: item.base_unit_price,
          productDiscount: item.product_discount,
          isBonus: item.is_bonus,
        }));
        setOrder(loaded);
        setFields(nextFields);
        setItems(nextItems);
        setSaleAccountId(loaded.sale_account_id);
        initial.current = JSON.stringify({ fields: nextFields, items: nextItems, saleAccountId: loaded.sale_account_id });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(apiMessages(reason, "تعذر تحميل الطلب.").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderId, retry]);

  const editable = order && canEditOrder(order, mode === "admin" ? "Admin" : "Representative");
  const title = order?.order_type === "Retail" ? "تعديل طلب الأونلاين" : order?.order_type === "StoreSale" ? "تعديل بيع المحل" : "تعديل طلب الجملة";
  const priceMode: "retail" | "wholesale" = order?.order_type === "Wholesale" ? "wholesale" : "retail";
  const estimatedTotal = items.reduce((sum, item) => sum + (item.isBonus ? 0 : Number(item.finalPrice) * item.quantity), 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!editable || saving || saveLock.current) return;
    setError("");
    if ((order.customer && (!fields.customer_name.trim() || !fields.phone.trim())) || items.length === 0) {
      setError(order.customer ? "اسم الزبون والهاتف وعنصر واحد على الأقل مطلوبة." : "أضف عنصرًا واحدًا على الأقل.");
      return;
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || (!item.isBonus && (!item.finalPrice.trim() || !Number.isFinite(Number(item.finalPrice)) || Number(item.finalPrice) < 0)))) {
      setError("راجع الكميات والأسعار الفعلية.");
      return;
    }
    const keys = items.map((item) => `${item.product_variant_id}:${item.isBonus}`);
    if (new Set(keys).size !== keys.length) {
      setError("يمكن إضافة الخيار مرة عادية ومرة كبونص فقط.");
      return;
    }
    const discount = Number(fields.order_discount || 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > estimatedTotal) {
      setError("خصم الطلب يجب ألا يتجاوز قيمة المنتجات.");
      return;
    }
    if (order.status === "Completed" && (saleAccounts.loading || saleAccounts.error || saleAccountId === null || !saleAccounts.accounts.some((account) => account.id === saleAccountId))) {
      setError(saleAccounts.error || "اختر حسابًا صالحًا للفاتورة قبل الحفظ.");
      return;
    }
    setConfirm(true);
  };

  const save = async () => {
    if (!editable || saveLock.current) return;
    if (order.status === "Completed" && (saleAccountId === null || !saleAccounts.accounts.some((account) => account.id === saleAccountId))) {
      setConfirm(false);
      setError("اختر حسابًا صالحًا للفاتورة قبل الحفظ.");
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      await ordersService.update(orderId, {
        ...(order.status === "Completed" && saleAccountId !== order.sale_account_id ? { sale_account_id: saleAccountId! } : {}),
        ...(order.customer ? {
          customer_name: fields.customer_name.trim(),
          phone: fields.phone.trim(),
          ...(fields.email.trim() ? { email: fields.email.trim() } : {}),
        } : {}),
        ...(order.customer && order.order_type !== "StoreSale" && fields.delivery_address.trim() ? { delivery_address: fields.delivery_address.trim() } : {}),
        ...(fields.notes.trim() ? { notes: fields.notes.trim() } : {}),
        order_discount: order.order_type === "Retail" ? 0 : Number(fields.order_discount || 0),
        items: items.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.isBonus ? 0 : decimal(Number(item.finalPrice) + Number(item.productDiscount)),
          is_bonus: item.isBonus,
        })),
      });
      setConfirm(false);
      onDirtyChange?.(false);
      onNavigate(detailsPath);
    } catch (reason) {
      setConfirm(false);
      setError(apiMessages(reason, "تعذر تحديث الطلب.").join("، "));
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  if (loading) return <Skeleton className="h-[600px]" />;
  if (!order) return <div className="rep-error text-center" role="alert"><p>{error || "الطلب غير موجود."}</p><button type="button" className="mt-3 inline-flex items-center gap-2 underline" onClick={() => setRetry((value) => value + 1)}><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>;
  if (!editable) return <div className="rounded-2xl border bg-amber-50 p-8 text-center"><h1 className="text-xl font-black text-brand">هذا الطلب للقراءة فقط</h1><p className="mt-2">{order.status === "Cancelled" ? "لا يمكن تعديل الطلب الملغي." : "لا تملك صلاحية تعديل هذا النوع من الطلبات."}</p><button className="btn-primary mt-5" onClick={() => onNavigate(detailsPath)}>عرض الطلب</button></div>;

  return <>
    <form onSubmit={submit} className="space-y-6">
      <header className="rep-page-header"><div><p className="rep-eyebrow">طلب #{orderId}</p><h1 className="rep-title">{title}</h1><p className="rep-subtitle">يحسب Backend فرق المخزون ويصحح قيد البيع عند الحفظ. الدفعات مستقلة عن تعديل الطلب.</p></div></header>
      {error && <div className="rep-error" role="alert"><p>{error}</p><button type="button" className="mt-2 underline" onClick={() => setRetry((value) => value + 1)}>إعادة تحميل النسخة الحالية</button></div>}
      {order.status === "Completed" && <section className="rep-section p-5">
        <h2 className="mb-3 font-black text-brand">حساب الفاتورة</h2>
        <GeneralSaleAccountSelect label="حساب الفاتورة *" accounts={saleAccounts.accounts} value={saleAccountId} onChange={setSaleAccountId} loading={saleAccounts.loading} error={saleAccounts.error} onRetry={saleAccounts.reload} onNavigate={mode === "admin" ? onNavigate : undefined} />
        <p className="mt-2 text-xs text-stone-500">الحساب الحالي: {order.sale_account?.name ?? "غير محدد"}</p>
      </section>}
      <section className="rep-section p-5">
        <h2 className="mb-4 font-black text-brand">{order.customer ? "بيانات الزبون" : "بيانات الطلب"}</h2>
        {order.customer && <p className="mb-4 text-xs text-stone-500">يربط النظام الطلب بالزبون حسب رقم الهاتف.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {order.customer && <>
            <Field label="الاسم" value={fields.customer_name} onChange={(value) => setFields({ ...fields, customer_name: value })} />
            <Field label="الهاتف" value={fields.phone} onChange={(value) => setFields({ ...fields, phone: value })} />
            <Field label="البريد" value={fields.email} onChange={(value) => setFields({ ...fields, email: value })} />
            {order.order_type !== "StoreSale" && <Field label="العنوان" value={fields.delivery_address} onChange={(value) => setFields({ ...fields, delivery_address: value })} />}
          </>}
          {order.order_type !== "Retail" && <Field label="خصم الطلب" type="number" value={fields.order_discount} onChange={(value) => setFields({ ...fields, order_discount: value })} />}
          <Field label="ملاحظات" value={fields.notes} onChange={(value) => setFields({ ...fields, notes: value })} />
        </div>
      </section>
      <section className="rep-section">
        <header className="rep-section-heading gap-3 sm:flex-row sm:justify-between"><div><h2>عناصر الطلب</h2><p>السعر الفعلي بعد خصم المنتج؛ يعيد Backend احتساب الإجمالي عند الحفظ.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-outline border-gold/40 bg-gold/5" onClick={() => setBonusPicker(true)}><Plus className="h-4 w-4" /> إضافة بونص</button><button type="button" className="btn-primary" onClick={() => setPicker(true)}><Plus className="h-4 w-4" /> إضافة صنف</button></div></header>
        <div className="space-y-3 p-5">{items.map((item, index) => <div key={`${item.product_variant_id}-${item.isBonus}`} className={`grid items-end gap-3 rounded-xl border p-3 lg:grid-cols-[1fr_150px_150px_auto] ${item.isBonus ? "border-gold/30 bg-gold/5" : ""}`}>
          <div><b>{item.label}</b>{item.isBonus && <span className="mr-2 rounded-full bg-gold/20 px-2 py-1 text-xs font-black text-brand">بونص</span>}{!item.isBonus && <p className="text-xs text-stone-500">السعر الأساسي {formatMoney(item.basePrice)} · خصم المنتج {formatMoney(item.productDiscount)}</p>}{!item.isBonus && !items.some((other) => other.product_variant_id === item.product_variant_id && other.isBonus) && <button type="button" className="mt-2 block text-xs font-bold text-gold-dark" onClick={() => setItems((current) => [...current, { ...item, quantity: 1, isBonus: true, finalPrice: "0", productDiscount: "0" }])}>إضافة نفس الخيار كبونص</button>}</div>
          <QuantityInput value={item.quantity} max={Number.MAX_SAFE_INTEGER} onChange={(quantity) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity } : entry))} />
          <label><span className="rep-label">السعر الفعلي</span><input className="rep-control" type="number" min="0" step="0.01" disabled={item.isBonus} value={item.isBonus ? "0" : item.finalPrice} onChange={(event) => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, finalPrice: event.target.value } : entry))} /></label>
          <button type="button" className="p-3 text-red-700" aria-label={`إزالة ${item.label}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-5 w-5" /></button>
        </div>)}</div>
      </section>
      <div className="sticky bottom-3 flex gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl"><button disabled={saving} className="btn-primary">{saving ? "جاري الحفظ…" : "حفظ التعديلات"}</button><button type="button" className="btn-outline" onClick={() => onNavigate(detailsPath)}>إلغاء</button></div>
    </form>
    <RepProductPicker open={picker} existing={items.filter((item) => !item.isBonus)} priceMode={priceMode} allowOutOfStock onClose={() => setPicker(false)} onAdd={(picked) => { setItems((current) => [...current, { ...picked, finalPrice: picked.display_price ?? "0", basePrice: picked.original_price ?? picked.display_price ?? "0", productDiscount: picked.display_discount ?? "0", isBonus: false }]); setPicker(false); }} />
    <RepProductPicker open={bonusPicker} existing={items.filter((item) => item.isBonus)} priceMode={priceMode} allowOutOfStock onClose={() => setBonusPicker(false)} onAdd={(picked) => { setItems((current) => [...current, { ...picked, finalPrice: "0", basePrice: picked.original_price ?? picked.display_price ?? "0", productDiscount: "0", isBonus: true }]); setBonusPicker(false); }} />
    <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => void save()} loading={saving} severity="normal" title="حفظ تعديلات الطلب" message="هل تريد حفظ التعديلات؟ سيُحدّث إجمالي الطلب والمخزون والحساب تلقائيًا عند الحاجة، وستبقى الدفعات المسجلة كما هي." confirmLabel="حفظ التعديلات" />
  </>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="rep-label">{label}</span><input className="rep-control" type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
