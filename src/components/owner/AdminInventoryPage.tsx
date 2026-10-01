import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Boxes, History, RefreshCw, Search } from "lucide-react";
import {
  categoriesService,
  colorsService,
  inventoryService,
  type CategoryResponseDto,
  type ColorResponseDto,
  type InventoryItemDto,
  type InventoryMovementDto,
  type PaginationResponseDto,
  type StockStatus,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages } from "@/components/rep/repOrderUtils";

const empty: PaginationResponseDto = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
};
const emptyMovementPagination: PaginationResponseDto = { page: 1, limit: 10, total: 0, total_pages: 0 };
const movementLabels: Record<string, string> = {
  Sale: "بيع وخصم من المخزون",
  Order: "طلب",
  OrderEdit: "تعديل طلب",
  OrderCancelled: "إلغاء طلب",
  CustomerPurchase: "شراء من زبون",
  CustomerPurchaseEdit: "تعديل شراء من زبون",
  CustomerPurchaseCancelled: "إلغاء شراء من زبون",
  SalesReturn: "مردود مبيعات",
  PurchaseReturn: "مردود مشتريات",
  ReturnCancelled: "إلغاء مردود",
  ManualAdjustment: "تعديل يدوي",
  OpeningBalance: "رصيد افتتاحي",
  OpeningStock: "مخزون افتتاحي",
  OpeningBalanceCancelled: "إلغاء رصيد افتتاحي",
  Cancellation: "إلغاء",
};
export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [pagination, setPagination] = useState(empty);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [sort, setSort] = useState("stock_quantity:asc");
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [auxErrors, setAuxErrors] = useState<string[]>([]);
  const [auxRetry, setAuxRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [openingItem, setOpeningItem] = useState<InventoryItemDto | null>(null);
  const [pendingOpeningItem, setPendingOpeningItem] = useState<InventoryItemDto | null>(null);
  const [openingQuantity, setOpeningQuantity] = useState("");
  const [openingCost, setOpeningCost] = useState("");
  const [existingOpeningCost, setExistingOpeningCost] = useState<string | null>(null);
  const [openingReady, setOpeningReady] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItemDto | null>(null);
  const [movements, setMovements] = useState<InventoryMovementDto[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementSearch, setMovementSearch] = useState("");
  const [movementQuery, setMovementQuery] = useState("");
  const [movementSource, setMovementSource] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const [movementPagination, setMovementPagination] = useState(emptyMovementPagination);
  const [movementError, setMovementError] = useState("");
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setAuxErrors([]);
    Promise.allSettled([
      categoriesService.list(c.signal),
      colorsService.list(c.signal),
    ]).then(([cats, cols]) => {
      if (c.signal.aborted) return;
      if (cats.status === "fulfilled") setCategories(cats.value);
      else
        setAuxErrors((v) => [
          ...v,
          ...apiMessages(cats.reason, "تعذر تحميل التصنيفات."),
        ]);
      if (cols.status === "fulfilled") setColors(cols.value);
      else
        setAuxErrors((v) => [
          ...v,
          ...apiMessages(cols.reason, "تعذر تحميل الألوان."),
        ]);
    });
    return () => c.abort();
  }, [auxRetry]);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      const [sort_by, sort_order] = sort.split(":") as [
        "stock_quantity" | "product_name" | "code",
        "asc" | "desc",
      ];
      return inventoryService
        .list(
          {
            page,
            limit: 20,
            search: query || undefined,
            category_id: category ? Number(category) : undefined,
            color_id: color ? Number(color) : undefined,
            stock_status: (stock as StockStatus) || undefined,
            threshold: Number(threshold || 5),
            sort_by,
            sort_order,
          },
          signal,
        )
        .then((r) => {
          if (signal?.aborted) return;
          setItems(r.items);
          setPagination(r.pagination);
        })
        .catch((e) => {
          if (!signal?.aborted)
            setErrors(apiMessages(e, "تعذر تحميل المخزون."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [category, color, page, query, sort, stock, threshold],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const change = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  const clear = () => {
    setSearch("");
    setQuery("");
    setCategory("");
    setColor("");
    setStock("");
    setThreshold("5");
    setSort("stock_quantity:asc");
    setPage(1);
  };
  const openOpening = (item: InventoryItemDto) => {
    setOpeningItem(item);
    setOpeningQuantity("");
    setOpeningCost("");
    setExistingOpeningCost(null);
    setOpeningReady(false);
    setStockErrors([]);
  };
  useEffect(() => {
    if (!openingItem) return;
    let cancelled = false;
    void inventoryService.cost(openingItem.product_variant_id)
      .then((result) => {
        if (cancelled) return;
        setExistingOpeningCost(result.opening_cost);
        setOpeningCost(result.opening_cost ?? "");
        setOpeningReady(true);
      })
      .catch((error) => {
        if (!cancelled) setStockErrors(apiMessages(error, "تعذر تحميل السعر الافتتاحي."));
      });
    return () => { cancelled = true; };
  }, [openingItem]);
  const prepare = (e: FormEvent) => {
    e.preventDefault();
    if (!openingItem || !openingReady) return;
    const quantity = Number(openingQuantity);
    const price = Number(openingCost);
    if (openingCost.trim() === "" || !Number.isFinite(price) || price < 0) {
      setStockErrors(["أدخل سعر شراء افتتاحي صحيحًا."]);
      return;
    }
    if (existingOpeningCost === null &&
      (openingQuantity.trim() === "" || !Number.isInteger(quantity) || quantity < 0 || (quantity === 0 && openingItem.stock_quantity === 0))) {
      setStockErrors(["أدخل كمية افتتاحية صحيحة. يمكن إدخال صفر فقط لتسعير مخزون موجود."]);
      return;
    }
    setStockErrors([]);
    setPendingOpeningItem(openingItem);
    setOpeningItem(null);
    setConfirm(true);
  };
  const saveOpening = async () => {
    if (!pendingOpeningItem) return;
    setSaving(true);
    setStockErrors([]);
    try {
      const result = existingOpeningCost === null
        ? await inventoryService.openingStock(pendingOpeningItem.product_variant_id, {
          quantity: Number(openingQuantity), unit_cost: Number(openingCost),
        })
        : await inventoryService.updateOpeningCost(pendingOpeningItem.product_variant_id, Number(openingCost));
      setConfirm(false);
      setPendingOpeningItem(null);
      setNotice(result.message);
      await load();
    } catch (e) {
      setConfirm(false);
      setOpeningItem(pendingOpeningItem);
      setPendingOpeningItem(null);
      setStockErrors(apiMessages(e, "تعذر حفظ المخزون الافتتاحي."));
    } finally {
      setSaving(false);
    }
  };
  const openMovements = (item: InventoryItemDto) => {
    setMovementItem(item);
    setMovements([]);
    setMovementSearch("");
    setMovementQuery("");
    setMovementSource("");
    setMovementPage(1);
    setMovementPagination(emptyMovementPagination);
    setMovementError("");
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMovementPage(1);
      setMovementQuery(movementSearch.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [movementSearch]);
  useEffect(() => {
    if (!movementItem) return;
    const controller = new AbortController();
    setMovementsLoading(true);
    setMovementError("");
    inventoryService.movements(movementItem.product_variant_id, {
      page: movementPage,
      limit: 10,
      search: movementQuery || undefined,
      source_type: movementSource || undefined,
    }, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      setMovements(response.items);
      setMovementPagination(response.pagination);
    }).catch((error) => {
      if (!controller.signal.aborted) setMovementError(apiMessages(error, "تعذر تحميل حركات المخزون.").join("، "));
    }).finally(() => {
      if (!controller.signal.aborted) setMovementsLoading(false);
    });
    return () => controller.abort();
  }, [movementItem, movementPage, movementQuery, movementSource]);
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">المخزون الحالي</p>
        <h1 className="mt-1 text-3xl font-black text-brand">إدارة المخزون</h1>
        <p className="mt-2 text-sm text-stone-500">
          راقب الحركات وسجّل إضافة أو خصمًا يدويًا موثقًا لكل خيار.
        </p>
      </header>
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
          {notice}
        </div>
      )}
      <section className="rounded-2xl border bg-white p-4">
        <div className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="rep-label">البحث</span>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                className="rep-control pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="المنتج أو الكود"
              />
            </span>
          </label>
          <RepSelect
            label="التصنيف"
            value={category}
            onChange={change(setCategory)}
            options={[
              { value: "", label: "كل التصنيفات" },
              ...categories.map((x) => ({
                value: String(x.category_id),
                label: x.name,
              })),
            ]}
          />
          <RepSelect
            label="اللون"
            value={color}
            onChange={change(setColor)}
            options={[
              { value: "", label: "كل الألوان" },
              ...colors.map((x) => ({
                value: String(x.color_id),
                label: x.name,
              })),
            ]}
          />
          <RepSelect
            label="حالة المخزون"
            value={stock}
            onChange={change(setStock)}
            options={[
              { value: "", label: "كل الحالات" },
              { value: "in_stock", label: "متوفر" },
              { value: "low_stock", label: "منخفض" },
              { value: "out_of_stock", label: "نفد" },
            ]}
          />
          <label>
            <span className="rep-label">حد المخزون المنخفض</span>
            <input
              type="number"
              min="0"
              step="1"
              className="rep-control"
              value={threshold}
              onChange={(e) => {
                setThreshold(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <RepSelect
            label="الترتيب"
            value={sort}
            onChange={change(setSort)}
            options={[
              { value: "stock_quantity:asc", label: "الأقل مخزونًا" },
              { value: "stock_quantity:desc", label: "الأعلى مخزونًا" },
              { value: "product_name:asc", label: "اسم المنتج" },
              { value: "code:asc", label: "الكود" },
            ]}
          />
        </div>
        {(search ||
          query ||
          category ||
          color ||
          stock ||
          threshold !== "5" ||
          sort !== "stock_quantity:asc") && (
          <button
            type="button"
            onClick={clear}
            className="mt-3 text-xs font-black text-gold-dark"
          >
            مسح الفلاتر
          </button>
        )}
        {auxErrors.length > 0 && (
          <div className="mt-3 flex justify-between rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800">
            <span>{auxErrors.join("، ")}</span>
            <button
              onClick={() => setAuxRetry((v) => v + 1)}
              className="underline"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </section>
      {errors.length > 0 && (
        <div className="rep-error text-center">
          {errors.join("، ")}
          <button
            onClick={() => setRetry((v) => v + 1)}
            className="mx-auto mt-2 flex gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title="لا توجد خيارات مطابقة"
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "المنتج",
                    "التصنيف",
                    "الحجم",
                    "اللون",
                    "الكمية",
                    "متوسط سعر الشراء",
                    "الحالة",
                    "",
                  ].map((x, i) => (
                    <th key={`${x}-${i}`} className="px-4 py-3 text-right">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((x) => (
                  <tr key={x.product_variant_id}>
                    <td className="px-4 py-3">
                      <b className="block text-brand">{x.product.name}</b>
                      <small>{x.product.code}</small>
                    </td>
                    <td className="px-4">{x.category.name}</td>
                    <td className="px-4">{x.size}</td>
                    <td className="px-4">{x.color.name}</td>
                    <td className="px-4 text-2xl font-black">
                      {x.stock_quantity}
                    </td>
                    <td className="px-4 text-sm font-bold">{x.average_purchase_price === null ? 'لم يُدخل' : `${x.average_purchase_price} ₪`}</td>
                    <td className="px-4">
                      <StockBadge
                        quantity={x.stock_quantity}
                        threshold={Number(threshold || 5)}
                      />
                    </td>
                    <td className="px-4">
                      <div className="flex gap-2"><button
                        onClick={() => openOpening(x)}
                        className="rounded-lg bg-brand px-3 py-2 text-xs font-black text-white"
                      >
                        {x.average_purchase_price === null ? "إضافة مخزون افتتاحي" : "تعديل السعر الافتتاحي"}
                      </button><button onClick={() => void openMovements(x)} className="rounded-lg border px-3 py-2 text-xs font-black"><History className="inline h-4 w-4" /> الحركات</button></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {items.map((x) => (
              <article
                key={x.product_variant_id}
                className="rounded-2xl border bg-white p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <b className="text-brand">{x.product.name}</b>
                    <p className="text-xs text-stone-500">
                      {x.product.code} · {x.category.name}
                    </p>
                    <p className="mt-2 text-sm">
                      {x.size} · {x.color.name}
                    </p>
                  </div>
                  <div className="text-center">
                    <b className="block text-3xl">{x.stock_quantity}</b>
                    <StockBadge
                      quantity={x.stock_quantity}
                      threshold={Number(threshold || 5)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-stone-600">متوسط سعر الشراء: <b>{x.average_purchase_price === null ? 'لم يُدخل' : `${x.average_purchase_price} ₪`}</b></p>
                <button
                  onClick={() => openOpening(x)}
                  className="mt-4 min-h-11 w-full rounded-xl bg-brand font-black text-white"
                >
                  {x.average_purchase_price === null ? "إضافة مخزون افتتاحي" : "تعديل السعر الافتتاحي"}
                </button>
                <button onClick={() => void openMovements(x)} className="mt-2 min-h-11 w-full rounded-xl border font-black">حركات المخزون</button>
              </article>
            ))}
          </div>
        </>
      )}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-3">
          <button
            className="btn-outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            السابق
          </button>
          <span className="py-2 text-sm font-bold">
            {page} / {pagination.total_pages}
          </span>
          <button
            className="btn-outline"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
          >
            التالي
          </button>
        </div>
      )}
      <Modal
        open={openingItem !== null}
        onClose={() => setOpeningItem(null)}
        title="المخزون الافتتاحي"
      >
        <form onSubmit={prepare} className="space-y-4">
          {openingItem && (
            <div className="rounded-xl bg-stone-50 p-4">
              <b className="text-brand">{openingItem.product.name}</b>
              <p className="text-sm text-stone-500">
                {openingItem.size} · {openingItem.color.name}
              </p>
              <p className="mt-2">
                الكمية الحالية: <strong>{openingItem.stock_quantity}</strong>
              </p>
            </div>
          )}
          {!openingReady && stockErrors.length === 0 && <p className="text-sm text-stone-500">جاري تحميل السعر الافتتاحي…</p>}
          {openingReady && <p className="text-sm text-stone-600">{existingOpeningCost === null
            ? "أدخل كمية البداية وسعر شراء القطعة معًا. إذا كان للصنف مخزون موجود، يمكنك إدخال 0 لتسجيل سعره دون زيادة الكمية."
            : "المخزون الافتتاحي مسجل. يمكنك تصحيح سعره هنا؛ إضافة بضاعة جديدة تتم من عملية شراء."}</p>}
          {stockErrors.length > 0 && (
            <div className="rep-error" role="alert">
              {stockErrors.join("، ")}
            </div>
          )}
          {existingOpeningCost === null && <label>
            <span className="rep-label">الكمية الافتتاحية المضافة</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              className="rep-control"
              value={openingQuantity}
              onChange={(e) => setOpeningQuantity(e.target.value)}
              placeholder="مثال: 10"
            />
          </label>}
          {openingItem && existingOpeningCost === null && Number.isInteger(Number(openingQuantity)) && Number(openingQuantity) > 0 && (
            <p className="rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand">
              الرصيد المتوقع: {openingItem.stock_quantity + Number(openingQuantity)}
            </p>
          )}
          <label className="block"><span className="rep-label">سعر شراء القطعة الافتتاحي</span><input className="rep-control" type="number" min="0" step="0.000001" value={openingCost} onChange={(event) => setOpeningCost(event.target.value)} /></label>
          <button
            disabled={saving || !openingReady || (openingItem?.stock_quantity ?? 0) < 0}
            className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
          >
            {existingOpeningCost === null ? "متابعة إضافة المخزون" : "متابعة تعديل السعر"}
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
          setOpeningItem(pendingOpeningItem);
          setPendingOpeningItem(null);
        }}
        onConfirm={() => void saveOpening()}
        loading={saving}
        severity="normal"
        title={existingOpeningCost === null ? "تأكيد المخزون الافتتاحي" : "تأكيد تعديل السعر الافتتاحي"}
        message={existingOpeningCost === null
          ? `تسجيل ${openingQuantity} قطعة بسعر شراء ${openingCost} ₪ للقطعة. ${pendingOpeningItem ? `الكمية بعد الإضافة: ${pendingOpeningItem.stock_quantity + Number(openingQuantity)}.` : ""}`
          : `تعديل سعر الشراء الافتتاحي من ${existingOpeningCost} إلى ${openingCost} ₪ للقطعة؟`}
        confirmLabel="تأكيد الحفظ"
      />
      <Modal open={movementItem !== null} onClose={() => setMovementItem(null)} title="حركات المخزون" size="lg">
        {movementItem && <div className="mb-3 rounded-xl bg-brand-50 px-3 py-2.5"><b className="text-sm text-brand">{movementItem.product.name} · <span dir="ltr">{movementItem.product.code}</span></b><p className="mt-0.5 text-xs text-stone-600">{movementItem.size} · {movementItem.color.name} · الرصيد الحالي <strong dir="ltr">{westernNumber(movementItem.stock_quantity)}</strong></p></div>}
        <div className="sticky top-0 z-10 mb-3 grid gap-2 bg-white pb-2 sm:grid-cols-2">
          <label><span className="rep-label">بحث في الحركات</span><input className="rep-control min-w-0" value={movementSearch} onChange={(event) => setMovementSearch(event.target.value)} placeholder="المرجع، المنفذ أو الملاحظات" /></label>
          <RepSelect label="نوع الحركة" value={movementSource} onChange={(value) => { setMovementPage(1); setMovementSource(value); }} options={[{ value: "", label: "كل الحركات" }, ...Object.entries(movementLabels).map(([value, label]) => ({ value, label }))]} />
        </div>
        {movementError && <div className="rep-error mb-3">{movementError}</div>}
        {movementsLoading ? <Skeleton className="h-48" /> : movements.length === 0 ? <EmptyState title={movementQuery || movementSource ? "لا توجد حركات مطابقة" : "لا توجد حركات مسجلة"} /> : <div className="space-y-2">{movements.map((movement) => <InventoryMovementRow key={movement.inventory_movement_id} movement={movement} />)}</div>}
        {!movementsLoading && movementPagination.total > 0 && <MovementPagination pagination={movementPagination} onChange={setMovementPage} />}
      </Modal>
    </div>
  );
}
function movementLabel(source: string) { return movementLabels[source] ?? "حركة مخزون"; }
function westernNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, useGrouping: false }).format(value);
}
function westernDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value)).replace(",", "").toUpperCase();
}
function movementReference(movement: InventoryMovementDto) {
  if (movement.order_id) return <>طلب <span dir="ltr">#{westernNumber(movement.order_id)}</span></>;
  if (movement.customer_purchase_id) return <>شراء زبون <span dir="ltr">#{westernNumber(movement.customer_purchase_id)}</span></>;
  if (movement.customer_return_id) return <>مردود <span dir="ltr">#{westernNumber(movement.customer_return_id)}</span></>;
  return <>حركة <span dir="ltr">#{westernNumber(movement.inventory_movement_id)}</span></>;
}
function InventoryMovementRow({ movement }: { movement: InventoryMovementDto }) {
  const positive = movement.quantity_change > 0;
  return <article className="rounded-xl border border-stone-200 bg-white px-3 py-2.5">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-brand">{movementLabel(movement.source_type)}</h3><span dir="ltr" className={`inline-flex min-w-10 items-center justify-center rounded-full px-2 py-0.5 text-xs font-black ${positive ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{positive ? "+" : ""}{westernNumber(movement.quantity_change)}</span></div><p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500"><span>{movementReference(movement)}</span><span aria-hidden="true">·</span><span>{movement.users?.name ?? "النظام"}</span><span aria-hidden="true">·</span><time dir="ltr" dateTime={movement.created_at}>{westernDateTime(movement.created_at)}</time></p></div>
      <strong dir="ltr" className="shrink-0 rounded-lg bg-stone-50 px-3 py-1.5 text-base tracking-wide text-brand">{westernNumber(movement.before_quantity)} <span className="text-stone-400">→</span> {westernNumber(movement.after_quantity)}</strong>
    </div>
    {movement.notes && <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-600">{movement.notes}</p>}
  </article>;
}
function MovementPagination({ pagination, onChange }: { pagination: PaginationResponseDto; onChange: (page: number) => void }) {
  const first = (pagination.page - 1) * pagination.limit + 1;
  const last = Math.min(pagination.page * pagination.limit, pagination.total);
  const start = Math.max(1, Math.min(pagination.page - 2, pagination.total_pages - 4));
  const pages = Array.from({ length: Math.min(5, pagination.total_pages) }, (_, index) => start + index);
  return <nav className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between" aria-label="صفحات حركات المخزون">
    <p className="text-center text-xs font-bold text-stone-500"><span dir="ltr">{westernNumber(first)}–{westernNumber(last)}</span> من <span dir="ltr">{westernNumber(pagination.total)}</span></p>
    {pagination.total_pages > 1 && <div className="flex items-center justify-center gap-1" dir="rtl"><button type="button" className="btn-outline min-h-9 px-3 py-1.5 text-xs" disabled={pagination.page <= 1} onClick={() => onChange(pagination.page - 1)}>السابق</button>{pages.map((page) => <button key={page} type="button" dir="ltr" aria-current={page === pagination.page ? "page" : undefined} className={page === pagination.page ? "h-9 min-w-9 rounded-lg bg-brand px-2 text-xs font-black text-white" : "h-9 min-w-9 rounded-lg border border-stone-200 bg-white px-2 text-xs font-black text-stone-600 hover:border-brand/30 hover:bg-brand-50"} onClick={() => onChange(page)}>{westernNumber(page)}</button>)}<button type="button" className="btn-outline min-h-9 px-3 py-1.5 text-xs" disabled={pagination.page >= pagination.total_pages} onClick={() => onChange(pagination.page + 1)}>التالي</button></div>}
  </nav>;
}
function StockBadge({
  quantity,
  threshold,
}: {
  quantity: number;
  threshold: number;
}) {
  const state =
    quantity < 0
      ? ["عجز بالمخزون", "bg-red-100 text-red-800"]
      : quantity === 0
      ? ["نفد المخزون", "bg-red-50 text-red-700"]
      : quantity <= threshold
        ? ["مخزون منخفض", "bg-amber-50 text-amber-800"]
        : ["مخزون طبيعي", "bg-emerald-50 text-emerald-700"];
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ${state[1]}`}
    >
      {state[0]}
    </span>
  );
}
