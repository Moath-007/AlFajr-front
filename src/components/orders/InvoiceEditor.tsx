import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ordersService,
  type OrderResponseDto,
} from "@/api";
import RepProductPicker, {
  type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages, formatMoney } from "@/components/rep/repOrderUtils";
import QuantityInput from "@/components/ui/QuantityInput";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import GeneralSaleAccountSelect from "./GeneralSaleAccountSelect";
import { useGeneralSaleAccounts } from "./useGeneralSaleAccounts";
import { canEditOrder } from "./orderEditPermission";
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
  const accounts = useGeneralSaleAccounts();
  const snapshot = JSON.stringify({ items, fields, account });
  const path = mode === "admin" ? "/owner/orders" : "/rep/orders";
  useEffect(() => {
    const controller = new AbortController();
    if (!orderId) return;
    setLoading(true);
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
  if (loading) return <p>جاري تحميل الفاتورة…</p>;
  if (orderId && !order)
    return (
      <div role="alert">
        {error}
        <button className="btn-outline" onClick={() => setRetry((n) => n + 1)}>
          إعادة المحاولة
        </button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-5 pb-20">
      <header className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-black text-brand">
          {orderId ? `تعديل الفاتورة #${orderId}` : "إنشاء فاتورة بيع"}
        </h1>
        <button
          type="button"
          className="btn-outline"
          onClick={() => onNavigate(orderId ? `${path}/${orderId}` : path)}
        >
          رجوع
        </button>
      </header>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {!editable && <p role="alert">هذه الفاتورة غير قابلة للتعديل.</p>}
      <fieldset disabled={!editable || saving} className="space-y-5">
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <GeneralSaleAccountSelect
            {...accounts}
            onRetry={accounts.reload}
            value={account}
            onChange={setAccount}
            label={
              order?.status === "Pending"
                ? "حساب البيع (مطلوب عند التأكيد)"
                : "حساب البيع *"
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {(["contact", "address", "notes"] as const).map(
              (key) => (
                <label key={key}>
                  {
                    {
                      contact: "بيانات التواصل",
                      address: "العنوان",
                      notes: "ملاحظات",
                    }[key]
                  }
                  <input
                    className="rep-control"
                    type="text"
                    value={fields[key]}
                    maxLength={key === "address" ? 255 : undefined}
                    onChange={(e) =>
                      setFields((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </label>
              ),
            )}
          </div>
        </section>
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <label>
            السعر الافتراضي للمنتجات المضافة
            <select
              className="rep-control"
              value={priceMode}
              onChange={(e) =>
                setPriceMode(
                  e.target.value === "retail" ? "retail" : "wholesale",
                )
              }
            >
              <option value="retail">مفرق</option>
              <option value="wholesale">جملة</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPicker("normal")}
            >
              إضافة منتج
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPicker("bonus")}
            >
              إضافة بونص
            </button>
          </div>
          {items.map((item, index) => (
            <article
              key={`${item.product_variant_id}:${item.bonus}`}
              className="space-y-2 rounded-xl border p-3"
            >
              <b>
                {item.label}
                {item.bonus ? " — بونص" : ""}
              </b>
              <div className="grid gap-3 sm:grid-cols-4">
                <label>
                  الكمية
                  <QuantityInput
                    value={item.quantity}
                    onChange={(quantity) => patchItem(index, { quantity })}
                  />
                </label>
                <label>
                  سعر الوحدة
                  <input
                    className="rep-control"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={item.bonus}
                    value={item.price}
                    onChange={(e) =>
                      patchItem(index, { price: e.target.value })
                    }
                  />
                </label>
                <label>
                  خصم الوحدة
                  <input
                    className="rep-control"
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={item.bonus}
                    value={item.discount}
                    onChange={(e) =>
                      patchItem(index, { discount: e.target.value })
                    }
                  />
                </label>
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.bonus}
                      onChange={(e) => {
                        if (
                          items.some(
                            (i, n) =>
                              n !== index &&
                              i.product_variant_id ===
                                item.product_variant_id &&
                              i.bonus === e.target.checked,
                          )
                        ) {
                          setError("يوجد سطر بهذه الحالة؛ ادمج الكمية أولًا.");
                          return;
                        }
                        patchItem(index, {
                          bonus: e.target.checked,
                          ...(e.target.checked
                            ? { price: "0", discount: "0" }
                            : {}),
                        });
                      }}
                    />{" "}
                    بونص
                  </label>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() =>
                      setItems((c) => c.filter((_, n) => n !== index))
                    }
                  >
                    حذف البند
                  </button>
                </div>
              </div>
              <p>
                {formatMoney(
                  (Number(item.price) - Number(item.discount)) * item.quantity,
                )}
              </p>
            </article>
          ))}
        </section>
        <label>
          خصم الفاتورة
          <input
            className="rep-control"
            type="number"
            min="0"
            step="0.01"
            value={fields.discount}
            onChange={(e) =>
              setFields((f) => ({ ...f, discount: e.target.value }))
            }
          />
        </label>
        <p className="text-xl font-black">
          الإجمالي: {formatMoney(subtotal - Number(fields.discount))}
        </p>
        <button className="btn-primary" disabled={saving || accounts.loading}>
          {saving ? "جاري الحفظ…" : orderId ? "حفظ التعديل" : "إنشاء الفاتورة"}
        </button>
      </fieldset>
      <RepProductPicker
        open={picker !== null}
        existing={items.filter((i) => i.bonus === (picker === "bonus"))}
        priceMode={priceMode}
        onClose={() => setPicker(null)}
        onAdd={add}
      />
      <ConfirmDialog
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
