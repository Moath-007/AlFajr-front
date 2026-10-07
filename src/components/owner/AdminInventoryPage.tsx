import { useInventoryMovements } from './useInventoryMovements';
import { useOpeningStock } from './useOpeningStock';

import {
  categoriesService,
  colorsService,
  inventoryService,
  type CategoryResponseDto,
  type ColorResponseDto
} from "@/api";
import { RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Boxes,
  History,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { InventoryMovementRow, MovementPagination, StockBadge } from './InventoryDisplay';
import { formatInventoryCost, movementLabels, westernNumber } from './inventoryPresentation';
import { useInventoryList } from './useInventoryList';

import CheckFiltersPopover from "@/components/finance/CheckFiltersPopover";
import "./AdminInventoryPage.css";
export default function AdminInventoryPage() {
  const { items, pagination, page, setPage, search, setSearch, setQuery, category, setCategory, color, setColor, stock, setStock, threshold, setThreshold, sort, setSort, loading, errors, setRetry, load } = useInventoryList();
  const { movementItem, setMovementItem, movements, movementsLoading, movementSearch, setMovementSearch, movementQuery, movementSource, setMovementSource, setMovementPage, movementPagination, movementError, openMovements } = useInventoryMovements();
  const { openingItem, setOpeningItem, pendingOpeningItem, setPendingOpeningItem, openingQuantity, setOpeningQuantity, openingCost, setOpeningCost, existingOpeningCost, setExistingOpeningCost, openingRows, selectedOpeningId, setSelectedOpeningId, openingReady, stockErrors, setStockErrors, confirm, setConfirm, saving, setSaving, notice, setNotice, openOpening, prepare, saveOpening } = useOpeningStock(load);

  const [advanced, setAdvanced] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const closeAdvanced = useCallback(() => {
    setAdvanced(false);
    filterTrigger.current?.focus();
  }, []);

  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [auxErrors, setAuxErrors] = useState<string[]>([]);
  const [auxRetry, setAuxRetry] = useState(0);

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
  const advancedCount = [
    category,
    color,
    threshold !== "5" ? threshold : "",
    sort !== "stock_quantity:asc" ? sort : "",
  ].filter(Boolean).length;
  const chips = [
    {
      key: "search",
      value: search.trim(),
      label: `البحث: ${search.trim()}`,
      clear: () => {
        setSearch("");
        setQuery("");
        setPage(1);
      },
    },
    {
      key: "stock",
      value: stock,
      label: `المخزون: ${{ in_stock: "متوفر", low_stock: "منخفض", out_of_stock: "نفد" }[stock] ?? ""}`,
      clear: () => change(setStock)(""),
    },
    {
      key: "category",
      value: category,
      label: `التصنيف: ${categories.find((c) => String(c.category_id) === category)?.name ?? "محدد"}`,
      clear: () => change(setCategory)(""),
    },
    {
      key: "color",
      value: color,
      label: `اللون: ${colors.find((c) => String(c.color_id) === color)?.name ?? "محدد"}`,
      clear: () => change(setColor)(""),
    },
    {
      key: "threshold",
      value: threshold !== "5" && threshold ? threshold : "",
      label: `حد المخزون المنخفض: ${threshold}`,
      clear: () => change(setThreshold)("5"),
    },
    {
      key: "sort",
      value: sort !== "stock_quantity:asc" ? sort : "",
      label: `الترتيب: ${{ "stock_quantity:desc": "الأعلى مخزونًا", "product_name:asc": "اسم المنتج", "code:asc": "الكود" }[sort] ?? ""}`,
      clear: () => change(setSort)("stock_quantity:asc"),
    },
  ].filter((chip) => chip.value);

  return (
    <div className="inventory-page space-y-4" dir="rtl">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">المخزون الحالي</p>
        <h1 className="mt-1 text-3xl font-black text-brand">إدارة المخزون</h1>
        <p className="mt-2 text-sm text-stone-500">
          تابع أرصدة الأصناف وتكلفتها وحركات المخزون.
        </p>
      </header>
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
          {notice}
        </div>
      )}
      <section className="rounded-2xl border bg-white p-4">
        <div className="inventory-quick-filters">
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
          <button
            ref={filterTrigger}
            type="button"
            className="btn-outline inventory-filter-trigger"
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal size={18} />
            فلاتر إضافية{advancedCount > 0 && <span>{advancedCount}</span>}
          </button>{" "}
        </div>
        <CheckFiltersPopover
          open={advanced}
          onClose={closeAdvanced}
          trigger={filterTrigger}
          footer={
            <button
              type="button"
              className="text-sm font-bold text-brand"
              onClick={clear}
            >
              مسح الكل
            </button>
          }
        >
          <div className="grid gap-3">
            {" "}
            <RepSelect
              floating
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
              floating
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
            <label>
              <span className="rep-label">حد المخزون المنخفض</span>
              <input
                type="number"
                min="1"
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
              floating
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
        </CheckFiltersPopover>
        <div className="inventory-chips">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.clear}
              type="button"
              aria-label={`إزالة فلتر ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X size={14} />
            </button>
          ))}
          {chips.length > 0 && (
            <button type="button" onClick={clear}>
              مسح الكل
            </button>
          )}
        </div>{" "}
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
        <div role="alert" className="rep-error text-center">
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
      <p className="text-xs text-stone-500">
        {pagination.total} صنف · صفحة {page} من{" "}
        {Math.max(1, pagination.total_pages)}
      </p>
      {loading ? (
        <div role="status">
          <span className="sr-only">جارٍ تحميل المخزون…</span>
          <Skeleton className="h-96" />
        </div>
      ) : errors.length > 0 ? null : items.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-8 w-8" />}
          title={
            chips.length ? "لا توجد أصناف مطابقة" : "لا توجد أصناف في المخزون"
          }
          action={
            chips.length ? (
              <button className="btn-outline" onClick={clear}>
                مسح الكل
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="inventory-table">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "المنتج",
                    "رمز المنتج",
                    "التصنيف",
                    "الحجم",
                    "اللون",
                    "الكمية",
                    "متوسط التكلفة",
                    "الحالة",
                    "الإجراءات",
                  ].map((x, i) => (
                    <th key={`${x}-${i}`} className="px-4 py-3 text-right">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((x) => (
                  <tr
                    key={x.product_variant_id}
                    tabIndex={0}
                    aria-label={`حركات ${x.product.name} ${x.size} ${x.color.name}`}
                    onClick={() => openMovements(x)}
                    onKeyDown={(e) => {
                      if (
                        e.target === e.currentTarget &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        openMovements(x);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <b className="block text-brand">{x.product.name}</b>
                    </td>
                    <td className="inventory-product-code">
                      <span dir="ltr">{x.product.code}</span>
                    </td>
                    <td className="px-4">{x.category.name}</td>
                    <td className="px-4">{x.size}</td>
                    <td className="px-4">{x.color.name}</td>
                    <td className="inventory-quantity">
                      <span dir="ltr">{x.stock_quantity}</span>
                    </td>
                    <td className="px-4 text-sm font-bold">
                      {x.average_cost === null
                        ? "لم يُدخل"
                        : formatInventoryCost(x.average_cost)}
                    </td>
                    <td className="px-4">
                      <StockBadge
                        quantity={x.stock_quantity}
                        threshold={Number(threshold || 5)}
                      />
                    </td>
                    <td className="px-4">
                      <div
                        className="inventory-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openOpening(x)}
                          className="inventory-opening-action"
                          title="المخزون الافتتاحي"
                          aria-label={`المخزون الافتتاحي ${x.product.name}`}
                        >
                          المخزون الافتتاحي
                        </button>
                        <button
                          onClick={() => void openMovements(x)}
                          className="inventory-history-action"
                          title="حركات المخزون"
                          aria-label={`حركات المخزون ${x.product.name}`}
                        >
                          <History size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inventory-cards lg:hidden">
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
                    <b className="block text-3xl" dir="ltr">
                      {x.stock_quantity}
                    </b>
                    <StockBadge
                      quantity={x.stock_quantity}
                      threshold={Number(threshold || 5)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  متوسط التكلفة:{" "}
                  <b>
                    {x.average_cost === null
                      ? "لم يُدخل"
                      : formatInventoryCost(x.average_cost)}
                  </b>
                </p>
                <button
                  onClick={() => openOpening(x)}
                  className="mt-4 min-h-11 w-full rounded-xl bg-brand font-black text-white"
                >
                  {x.average_cost === null
                    ? "إضافة مخزون افتتاحي"
                    : "تعديل السعر الافتتاحي"}
                </button>
                <button
                  onClick={() => void openMovements(x)}
                  className="mt-2 min-h-11 w-full rounded-xl border font-black"
                >
                  حركات المخزون
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {pagination.total_pages > 1 &&
        createPortal(
          <div
            dir="rtl"
            className="inventory-pagination"
            role="navigation"
            aria-label="صفحات المخزون"
          >
            <button
              dir="rtl"
              className="btn-outline"
              disabled={loading || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              السابق
            </button>
            <span className="py-2 text-sm font-bold">
              صفحة {page} من {pagination.total_pages}
            </span>
            <button
              dir="rtl"
              className="btn-outline"
              disabled={loading || page >= pagination.total_pages}
              onClick={() => setPage(page + 1)}
            >
              التالي
            </button>
          </div>,
          document.body,
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
          {!openingReady && stockErrors.length === 0 && (
            <p className="text-sm text-stone-500">
              جاري تحميل السعر الافتتاحي…
            </p>
          )}
          {openingReady && (
            <div className="space-y-2">
              <p>
                الحركة الافتتاحية إدخال مستقل؛ يمكن إضافتها حتى بعد حركات أخرى
                أو مع مخزون سالب.
              </p>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  setSelectedOpeningId(null);
                  setExistingOpeningCost(null);
                  setOpeningQuantity("");
                  setOpeningCost("");
                }}
              >
                حركة جديدة
              </button>
              {openingRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap gap-2 rounded border p-2"
                >
                  <span>
                    #{row.id}: {row.quantity} × {row.unit_cost} ₪
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOpeningId(row.id);
                      setExistingOpeningCost(row.unit_cost);
                      setOpeningQuantity(String(row.quantity));
                      setOpeningCost(row.unit_cost);
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (
                        !openingItem ||
                        !window.confirm(
                          "إلغاء هذه الحركة وإعادة حساب أثر التكلفة والحركات اللاحقة؟",
                        )
                      )
                        return;
                      setSaving(true);
                      void inventoryService
                        .cancelOpening(openingItem.product_variant_id, row.id)
                        .then(async (result) => {
                          setNotice(result.message);
                          setOpeningItem(null);
                          await load();
                        })
                        .catch((error) =>
                          setStockErrors(apiMessages(error, "تعذر الإلغاء")),
                        )
                        .finally(() => setSaving(false));
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              ))}
            </div>
          )}
          {stockErrors.length > 0 && (
            <div className="rep-error" role="alert">
              {stockErrors.join("، ")}
            </div>
          )}
          {
            <label>
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
            </label>
          }
          {openingItem &&
            existingOpeningCost === null &&
            Number.isInteger(Number(openingQuantity)) &&
            Number(openingQuantity) > 0 && (
              <p className="rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand">
                الرصيد المتوقع:{" "}
                {openingItem.stock_quantity + Number(openingQuantity)}
              </p>
            )}
          <label className="block">
            <span className="rep-label">سعر شراء القطعة الافتتاحي</span>
            <input
              className="rep-control"
              type="number"
              min="0"
              step="0.000001"
              value={openingCost}
              onChange={(event) => setOpeningCost(event.target.value)}
            />
          </label>
          <button
            disabled={saving || !openingReady}
            className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
          >
            {existingOpeningCost === null
              ? "متابعة إضافة المخزون"
              : "متابعة تصحيح الحركة"}
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
        title={
          existingOpeningCost === null
            ? "تأكيد المخزون الافتتاحي"
            : "تأكيد تصحيح الحركة الافتتاحية"
        }
        message={
          existingOpeningCost === null
            ? `تسجيل ${openingQuantity} قطعة بسعر شراء ${openingCost} ₪ للقطعة. ${pendingOpeningItem ? `الكمية بعد الإضافة: ${pendingOpeningItem.stock_quantity + Number(openingQuantity)}.` : ""}`
            : `تصحيح الحركة #${selectedOpeningId} إلى ${openingQuantity} قطعة بتكلفة ${openingCost} ₪ وإعادة حساب الحالة اللاحقة؟`
        }
        confirmLabel="تأكيد الحفظ"
      />
      <Modal
        open={movementItem !== null}
        onClose={() => setMovementItem(null)}
        title="حركات المخزون"
        size="lg"
      >
        {movementItem && (
          <div className="mb-3 rounded-xl bg-brand-50 px-3 py-2.5">
            <b className="text-sm text-brand">
              {movementItem.product.name} ·{" "}
              <span dir="ltr">{movementItem.product.code}</span>
            </b>
            <p className="mt-0.5 text-xs text-stone-600">
              {movementItem.size} · {movementItem.color.name} · الرصيد الحالي{" "}
              <strong dir="ltr">
                {westernNumber(movementItem.stock_quantity)}
              </strong>
            </p>
          </div>
        )}
        <div className="sticky top-0 z-10 mb-3 grid gap-2 bg-white pb-2 sm:grid-cols-2">
          <label>
            <span className="rep-label">بحث في الحركات</span>
            <input
              className="rep-control min-w-0"
              value={movementSearch}
              onChange={(event) => setMovementSearch(event.target.value)}
              placeholder="المرجع، المنفذ أو الملاحظات"
            />
          </label>
          <RepSelect
            label="نوع الحركة"
            value={movementSource}
            onChange={(value) => {
              setMovementPage(1);
              setMovementSource(value);
            }}
            options={[
              { value: "", label: "كل الحركات" },
              ...Object.entries(movementLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        {movementError && <div className="rep-error mb-3">{movementError}</div>}
        {movementsLoading ? (
          <Skeleton className="h-48" />
        ) : movements.length === 0 ? (
          <EmptyState
            title={
              movementQuery || movementSource
                ? "لا توجد حركات مطابقة"
                : "لا توجد حركات مسجلة"
            }
          />
        ) : (
          <div className="space-y-2">
            {movements.map((movement) => (
              <InventoryMovementRow
                key={movement.inventory_movement_id}
                movement={movement}
              />
            ))}
          </div>
        )}
        {!movementsLoading && movementPagination.total > 0 && (
          <MovementPagination
            pagination={movementPagination}
            onChange={setMovementPage}
          />
        )}
      </Modal>
    </div>
  );
}
