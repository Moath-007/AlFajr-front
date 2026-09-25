import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  customerPurchasesService,
  customersService,
  type CustomerPurchaseDto,
  type CustomerSelectionDto,
} from "@/api";
import RepProductPicker, {
  type PickedOrderItem,
} from "@/components/rep/RepProductPicker";
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import { formatMoney } from "@/utils/money";

type DraftItem = PickedOrderItem & { unitPrice: string };
const purchaseFrom = (response: {
  item?: CustomerPurchaseDto;
  purchase?: CustomerPurchaseDto;
}) => response.item ?? response.purchase ?? null;

export default function CustomerPurchasesPage() {
  const [items, setItems] = useState<CustomerPurchaseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    customerPurchasesService
      .list(controller.signal)
      .then((response) => setItems(response.items ?? response.purchases ?? []))
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            apiMessages(reason, "تعذر تحميل مشتريات الزبائن.").join("، "),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <div>
          <p className="text-xs font-black text-gold-dark">
            وارد المخزون من الزبائن
          </p>
          <h1 className="mt-1 text-3xl font-black text-brand">
            مشتريات الزبائن
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            إدارة عمليات شراء الأصناف من الزبائن.
          </p>
        </div>
        <button
          className="btn-primary inline-flex gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" /> إضافة عملية
        </button>
      </header>
      {error && (
        <div className="rep-error flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            className="btn-outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <Skeleton className="h-80" />
      ) : !error && items.length === 0 ? (
        <EmptyState title="لا توجد مشتريات زبائن" />
      ) : !error ? (
        <PurchaseTable items={items} onView={setSelectedId} />
      ) : null}
      <CreatePurchaseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          setRevision((value) => value + 1);
        }}
      />
      <PurchaseDetailsModal
        id={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={() => setRevision((value) => value + 1)}
      />
    </div>
  );
}

function PurchaseTable({
  items,
  onView,
}: {
  items: CustomerPurchaseDto[];
  onView: (id: number) => void;
}) {
  return (
    <div className="max-h-[620px] overflow-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="sticky top-0 bg-stone-50 text-xs text-stone-600">
          <tr>
            <th className="p-3 text-right">العملية</th>
            <th className="p-3 text-right">الزبون</th>
            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">الإجمالي</th>
            <th className="p-3 text-right">الحالة</th>
            <th className="w-28 p-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((purchase) => (
            <tr
              key={purchase.customer_purchase_id}
              className="hover:bg-stone-50"
            >
              <td className="p-3 font-black text-brand">
                #{purchase.customer_purchase_id}
              </td>
              <td className="p-3 font-bold">
                {purchase.customers?.name ?? `زبون #${purchase.customer_id}`}
              </td>
              <td className="p-3 text-xs text-stone-500">
                {new Date(purchase.created_at).toLocaleString("ar-EG")}
              </td>
              <td className="p-3 font-bold">
                {formatMoney(purchase.total_amount)}
              </td>
              <td className="p-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${purchase.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                >
                  {purchase.status === "Completed" ? "مكتملة" : "ملغاة"}
                </span>
              </td>
              <td className="p-2">
                <button
                  className="btn-outline inline-flex gap-1"
                  onClick={() => onView(purchase.customer_purchase_id)}
                >
                  <Eye className="h-4 w-4" /> التفاصيل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Amount({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <small className="text-stone-500">{label}</small>
      <b className="mt-1 block text-brand">{formatMoney(value)}</b>
    </div>
  );
}

function CreatePurchaseModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerSelectionDto[]>([]),
    [customerId, setCustomerId] = useState(""),
    [items, setItems] = useState<DraftItem[]>([]),
    [picker, setPicker] = useState(false),
    [notes, setNotes] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    customersService.list({ page: 1, limit: 100 }, controller.signal)
      .then((customerResponse) => setCustomers(customerResponse.customers))
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(apiMessages(reason, "تعذر تجهيز نموذج الشراء.").join("، "));
      });
    return () => controller.abort();
  }, [open]);
  const total = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice || 0),
    0,
  );
  const submit = async () => {
    if (!customerId) return setError("اختر الزبون.");
    if (
      !items.length ||
      items.some((item) => item.quantity < 1 || Number(item.unitPrice) < 0)
    )
      return setError("راجع الأصناف والكميات وأسعار الشراء.");
    setSaving(true);
    setError("");
    try {
      await customerPurchasesService.create({
        customer_id: Number(customerId),
        items: items.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice),
        })),
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (reason) {
      setError(apiMessages(reason, "تعذر إنشاء مشتريات الزبون.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة مشتريات زبون"
      size="return"
      mobileFullscreen
    >
      <div className="space-y-5">
        {error && <div className="rep-error">{error}</div>}
        <Select
          searchable
          searchPlaceholder="ابحث بالاسم أو الهاتف"
          label="الزبون"
          placeholder="اختر الزبون"
          value={customerId}
          onChange={setCustomerId}
          options={customers.map((customer) => ({
            value: String(customer.customer_id),
            label: `${customer.name} · ${customer.phone}`,
          }))}
        />
        <ItemsEditor
          items={items}
          onChange={setItems}
          pickerOpen={picker}
          setPickerOpen={setPicker}
        />
        <Amount label="إجمالي الشراء" value={total} />
        <label>
          <span className="rep-label">ملاحظات العملية</span>
          <textarea
            className="rep-control"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
          onClick={() => void submit()}
        >
          {saving ? "جاري الحفظ…" : "إنشاء العملية"}
        </button>
      </div>
    </Modal>
  );
}

function ItemsEditor({
  items,
  onChange,
  pickerOpen,
  setPickerOpen,
}: {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}) {
  const total = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice || 0),
    0,
  );
  return (
    <section className="rounded-xl border p-4">
      <div className="flex justify-between gap-3">
        <div>
          <h3 className="font-black text-brand">الأصناف</h3>
          <p className="text-xs text-stone-500">
            الكمية وسعر الشراء خاصان بهذه العملية.
          </p>
        </div>
        <button className="btn-outline" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" /> إضافة صنف
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div
            key={item.product_variant_id}
            className="grid items-end gap-2 rounded-xl bg-stone-50 p-3 sm:grid-cols-[1fr_100px_140px_110px_auto]"
          >
            <b className="self-center text-sm">{item.label}</b>
            <label>
              <span className="rep-label">الكمية</span>
              <input
                className="rep-control"
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(event) =>
                  onChange(
                    items.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, quantity: Number(event.target.value) }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <label>
              <span className="rep-label">سعر الشراء</span>
              <input
                className="rep-control"
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(event) =>
                  onChange(
                    items.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, unitPrice: event.target.value }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <div>
              <span className="rep-label">الإجمالي</span>
              <b className="block min-h-11 py-3">
                {formatMoney(item.quantity * Number(item.unitPrice || 0))}
              </b>
            </div>
            <button
              aria-label="إزالة الصنف"
              className="p-3 text-red-700"
              onClick={() =>
                onChange(items.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-left font-black text-brand">
        الإجمالي: {formatMoney(total)}
      </p>
      <RepProductPicker
        open={pickerOpen}
        existing={items}
        onClose={() => setPickerOpen(false)}
        onAdd={(picked) => {
          onChange([
            ...items,
            { ...picked, unitPrice: picked.display_price ?? "0" },
          ]);
          setPickerOpen(false);
        }}
        allowOutOfStock
      />
    </section>
  );
}
function PurchaseDetailsModal({
  id,
  onClose,
  onChanged,
}: {
  id: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [purchase, setPurchase] = useState<CustomerPurchaseDto | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [edit, setEdit] = useState(false),
    [cancelPurchase, setCancelPurchase] = useState(false),
    [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setPurchase(purchaseFrom(await customerPurchasesService.getById(id)));
    } catch (reason) {
      setError(apiMessages(reason, "تعذر تحميل تفاصيل العملية.").join("، "));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    setPurchase(null);
    if (id) void load();
  }, [id, load]);
  const cancel = async () => {
    if (!purchase) return;
    setSaving(true);
    try {
      await customerPurchasesService.cancel(purchase.customer_purchase_id);
      setCancelPurchase(false);
      await load();
      onChanged();
    } catch (reason) {
      setError(apiMessages(reason, "تعذر إلغاء العملية.").join("، "));
      setCancelPurchase(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Modal
        open={id !== null}
        onClose={onClose}
        title={`تفاصيل مشتريات الزبون #${id ?? ""}`}
        size="lg"
        mobileFullscreen
      >
        {loading ? (
          <Skeleton className="h-80" />
        ) : purchase ? (
          <div className="space-y-5">
            {error && <div className="rep-error">{error}</div>}
            <Amount label="إجمالي المستند" value={purchase.total_amount} />
            <section>
              <div className="flex justify-between">
                <h3 className="font-black text-brand">الأصناف</h3>
                {purchase.status === "Completed" && (
                  <button
                    className="btn-outline inline-flex gap-1"
                    onClick={() => setEdit(true)}
                  >
                    <Pencil className="h-4 w-4" /> تعديل
                  </button>
                )}
              </div>
              <div className="mt-2 divide-y rounded-xl border">
                {purchase.customer_purchase_items.map((item) => (
                  <div
                    key={item.customer_purchase_item_id}
                    className="flex flex-wrap justify-between gap-2 p-3 text-sm"
                  >
                    <span>
                      {variantName(item)} · الكمية {item.quantity} · الوحدة{" "}
                      {formatMoney(item.unit_price)}
                    </span>
                    <b>
                      {formatMoney(Number(item.unit_price) * item.quantity)}
                    </b>
                  </div>
                ))}
              </div>
              {purchase.notes && (
                <p className="mt-2 text-sm text-stone-500">{purchase.notes}</p>
              )}
            </section>
            {purchase.status === "Completed" && (
              <div className="flex flex-wrap gap-3 border-t pt-4">
                <button
                  className="btn-outline text-red-700"
                  onClick={() => setCancelPurchase(true)}
                >
                  إلغاء العملية
                </button>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="rep-error">{error}</div>
        ) : null}
      </Modal>
      {purchase && (
        <EditPurchaseModal
          open={edit}
          purchase={purchase}
          onClose={() => setEdit(false)}
          onSaved={async () => {
            setEdit(false);
            await load();
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={cancelPurchase}
        onClose={() => setCancelPurchase(false)}
        onConfirm={() => void cancel()}
        loading={saving}
        title="إلغاء مشتريات الزبون"
        message="سيُعكس أثر مستند الشراء على المخزون والحساب فقط. سندات الصرف المستقلة ستبقى كما هي."
        confirmLabel="إلغاء العملية"
      />
    </>
  );
}

function EditPurchaseModal({
  open,
  purchase,
  onClose,
  onSaved,
}: {
  open: boolean;
  purchase: CustomerPurchaseDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialItems = useMemo(
    () =>
      purchase.customer_purchase_items.map((item): DraftItem => ({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        label: variantName(item),
        stock: Number.MAX_SAFE_INTEGER,
        unitPrice: item.unit_price,
      })),
    [purchase],
  );
  const [items, setItems] = useState<DraftItem[]>(initialItems),
    [notes, setNotes] = useState(purchase.notes ?? ""),
    [picker, setPicker] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setItems(initialItems);
      setNotes(purchase.notes ?? "");
      setError("");
    }
  }, [initialItems, open, purchase.notes]);
  const save = async () => {
    if (
      !items.length ||
      items.some((item) => item.quantity < 1 || Number(item.unitPrice) < 0)
    )
      return setError("راجع الأصناف والكميات والأسعار.");
    setSaving(true);
    try {
      await customerPurchasesService.update(purchase.customer_purchase_id, {
        items: items.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice),
        })),
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (reason) {
      setError(apiMessages(reason, "تعذر تعديل العملية.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل مشتريات الزبون"
      size="xl"
      mobileFullscreen
    >
      <div className="space-y-4">
        {error && <div className="rep-error">{error}</div>}
        <ItemsEditor
          items={items}
          onChange={setItems}
          pickerOpen={picker}
          setPickerOpen={setPicker}
        />
        <label>
          <span className="rep-label">ملاحظات</span>
          <textarea
            className="rep-control"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
          onClick={() => void save()}
        >
          {saving ? "جاري الحفظ…" : "حفظ التعديلات"}
        </button>
      </div>
    </Modal>
  );
}
function variantName(
  item: CustomerPurchaseDto["customer_purchase_items"][number],
) {
  const product = item.product_variants?.products;
  const color = item.product_variants?.colors;
  return `${product?.name ?? product?.product_name ?? `خيار #${item.product_variant_id}`} — ${item.product_variants?.size ?? "—"} — ${color?.name ?? color?.color_name ?? "—"}`;
}
