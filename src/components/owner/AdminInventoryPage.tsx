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
  const [selected, setSelected] = useState<InventoryItemDto | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<InventoryItemDto | null>(null);
  const [addedQuantity, setAddedQuantity] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [movementItem, setMovementItem] = useState<InventoryItemDto | null>(null);
  const [movements, setMovements] = useState<InventoryMovementDto[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
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
  const change = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(search.trim());
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
  const open = (item: InventoryItemDto) => {
    setSelected(item);
    setPendingUpdate(null);
    setAddedQuantity("");
    setAdjustmentNotes("");
    setStockErrors([]);
  };
  const prepare = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(addedQuantity);
    if (!Number.isInteger(n) || n === 0) {
      setStockErrors(["التغيير يجب أن يكون عددًا صحيحًا موجبًا أو سالبًا، ولا يمكن أن يكون صفرًا."]);
      return;
    }
    setPendingUpdate(selected);
    setSelected(null);
    setConfirm(true);
  };
  const update = async () => {
    if (!pendingUpdate) return;
    setSaving(true);
    setStockErrors([]);
    try {
      const r = await inventoryService.adjust(
        pendingUpdate.product_variant_id,
        { quantity_change: Number(addedQuantity), notes: adjustmentNotes.trim() || undefined },
      );
      setConfirm(false);
      setPendingUpdate(null);
      setNotice(r.message);
      await load();
    } catch (e) {
      setConfirm(false);
      setSelected(pendingUpdate);
      setPendingUpdate(null);
      setStockErrors(apiMessages(e, "تعذر تحديث كمية المخزون."));
    } finally {
      setSaving(false);
    }
  };
  const openMovements = async (item: InventoryItemDto) => {
    setMovementItem(item);
    setMovements([]);
    setMovementsLoading(true);
    try {
      const response = await inventoryService.movements(item.product_variant_id);
      setMovements(Array.isArray(response) ? response : response.items ?? response.movements ?? []);
    } catch (error) {
      setStockErrors(apiMessages(error, "تعذر تحميل حركات المخزون."));
    } finally { setMovementsLoading(false); }
  };
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
        <form
          onSubmit={submit}
          className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
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
          <button className="min-h-11 rounded-xl bg-brand px-5 font-black text-white">
            بحث
          </button>
        </form>
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
                    <td className="px-4">
                      <StockBadge
                        quantity={x.stock_quantity}
                        threshold={Number(threshold || 5)}
                      />
                    </td>
                    <td className="px-4">
                      <div className="flex gap-2"><button
                        onClick={() => open(x)}
                        className="rounded-lg bg-brand px-3 py-2 text-xs font-black text-white"
                      >
                        تعديل يدوي
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
                <button
                  onClick={() => open(x)}
                  className="mt-4 min-h-11 w-full rounded-xl bg-brand font-black text-white"
                >
                  تعديل يدوي
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
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="تعديل يدوي للمخزون"
      >
        <form onSubmit={prepare} className="space-y-4">
          {selected && (
            <div className="rounded-xl bg-stone-50 p-4">
              <b className="text-brand">{selected.product.name}</b>
              <p className="text-sm text-stone-500">
                {selected.size} · {selected.color.name}
              </p>
              <p className="mt-2">
                الكمية الحالية: <strong>{selected.stock_quantity}</strong>
              </p>
            </div>
          )}
          {stockErrors.length > 0 && (
            <div className="rep-error" role="alert">
              {stockErrors.join("، ")}
            </div>
          )}
          <label>
            <span className="rep-label">التغيير (موجب للإضافة، سالب للخصم)</span>
            <input
              autoFocus
              type="number"
              step="1"
              className="rep-control"
              value={addedQuantity}
              onChange={(e) => setAddedQuantity(e.target.value)}
              placeholder="مثال: 10 أو -3"
            />
          </label>
          {selected && Number.isInteger(Number(addedQuantity)) && Number(addedQuantity) !== 0 && (
            <p className="rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand">
              الرصيد المتوقع: {selected.stock_quantity + Number(addedQuantity)}
            </p>
          )}
          <label><span className="rep-label">ملاحظات (اختياري)</span><textarea className="rep-control" value={adjustmentNotes} onChange={(e) => setAdjustmentNotes(e.target.value)} /></label>
          <button
            disabled={saving}
            className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
          >
            متابعة
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
          setSelected(pendingUpdate);
          setPendingUpdate(null);
        }}
        onConfirm={() => void update()}
        loading={saving}
        severity={Number(addedQuantity) < 0 ? "destructive" : "normal"}
        title="تأكيد تعديل المخزون"
        message={`تغيير الرصيد بمقدار ${addedQuantity} من (${pendingUpdate?.stock_quantity ?? ""}) إلى ${pendingUpdate ? pendingUpdate.stock_quantity + Number(addedQuantity) : ""}؟`}
        confirmLabel="تأكيد التعديل"
      />
      <Modal open={movementItem !== null} onClose={() => setMovementItem(null)} title="حركات المخزون" size="lg">
        {movementsLoading ? <Skeleton className="h-48" /> : movements.length === 0 ? <EmptyState title="لا توجد حركات مسجلة" /> : <div className="space-y-3">{movements.map((m) => <article key={m.inventory_movement_id} className="rounded-xl border p-3"><div className="flex justify-between"><b className={m.quantity_change > 0 ? "text-emerald-700" : "text-red-700"}>{m.quantity_change > 0 ? "+" : ""}{m.quantity_change}</b><span className="text-xs text-stone-500">{new Date(m.created_at).toLocaleString("ar-EG")}</span></div><p className="text-sm">{movementLabel(m.source_type)}{m.order_id ? ` · طلب #${m.order_id}` : ""}{m.customer_purchase_id ? ` · مشتريات زبون #${m.customer_purchase_id}` : ""}</p><p className="text-xs text-stone-500">{m.users?.name ?? "النظام"}{m.notes ? ` · ${m.notes}` : ""}</p></article>)}</div>}
      </Modal>
    </div>
  );
}
function movementLabel(source: string) { return ({ Order: "طلب", CustomerPurchase: "مشتريات زبون", ManualAdjustment: "تعديل يدوي", Cancellation: "إلغاء" } as Record<string, string>)[source] ?? source; }
function StockBadge({
  quantity,
  threshold,
}: {
  quantity: number;
  threshold: number;
}) {
  const state =
    quantity === 0
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
