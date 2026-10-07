import ZoomableProductImage from '@/components/ui/ProductImage';
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eye,
  ImageOff,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  categoriesService,
  colorsService,
  productsService,
  resolveApiAssetUrl,
  type AdminProductsPaginationDto,
  type CategoryResponseDto,
  type ColorResponseDto,
  type ProductResponseDto,
  type StockStatus,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages, formatOrderDate } from "@/components/rep/repOrderUtils";

import CheckFiltersPopover from "@/components/finance/CheckFiltersPopover";
import "./AdminProductsPage.css";
const emptyPage: AdminProductsPaginationDto = {
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
};
export default function AdminProductsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [advanced, setAdvanced] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const closeAdvanced = useCallback(() => {
    setAdvanced(false);
    filterTrigger.current?.focus();
  }, []);
  const [products, setProducts] = useState<ProductResponseDto[]>([]);
  const [pagination, setPagination] = useState(emptyPage);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [active, setActive] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [auxErrors, setAuxErrors] = useState<string[]>([]);
  const [auxRetry, setAuxRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [statusTarget, setStatusTarget] = useState<ProductResponseDto | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ProductResponseDto | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
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
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      const [sort_by, sort_order] = sort.split(":") as [
        "created_at" | "name" | "code",
        "asc" | "desc",
      ];
      return productsService
        .listAdmin(
          {
            page,
            limit: 20,
            search: query || undefined,
            category_id: category ? Number(category) : undefined,
            color_id: color ? Number(color) : undefined,
            is_active: active === "" ? undefined : active === "true",
            stock_status: (stock as StockStatus) || undefined,
            sort_by,
            sort_order,
          },
          signal,
        )
        .then((r) => {
          if (signal?.aborted) return;
          setProducts(r.products);
          setPagination(r.pagination);
          if (page > Math.max(1, r.pagination.total_pages))
            setPage(Math.max(1, r.pagination.total_pages));
        })
        .catch((e) => {
          if (!signal?.aborted)
            setErrors(apiMessages(e, "تعذر تحميل المنتجات."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [active, category, color, page, query, sort, stock],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const clear = () => {
    setSearch("");
    setQuery("");
    setCategory("");
    setColor("");
    setActive("");
    setStock("");
    setSort("created_at:desc");
    setPage(1);
  };
  const advancedCount = [
    category,
    color,
    stock,
    sort !== "created_at:desc" ? sort : "",
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
      key: "active",
      value: active,
      label: active === "true" ? "فعال" : "غير فعال",
      clear: () => change(setActive)(""),
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
      key: "stock",
      value: stock,
      label: `المخزون: ${{ in_stock: "متوفر", low_stock: "منخفض", out_of_stock: "نفد" }[stock] ?? ""}`,
      clear: () => change(setStock)(""),
    },
    {
      key: "sort",
      value: sort === "created_at:desc" ? "" : sort,
      label: `الترتيب: ${{ "created_at:asc": "الأقدم", "name:asc": "الاسم", "code:asc": "الكود" }[sort] ?? ""}`,
      clear: () => change(setSort)("created_at:desc"),
    },
  ].filter((chip) => chip.value);
  const deleteProduct = async () => {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    setErrors([]);
    try {
      const result = await productsService.permanentDelete(deleteTarget.id);
      setNotice(result.message);
      setDeleteTarget(null);
      await load();
    } catch (error) {
      setDeleteTarget(null);
      setErrors(apiMessages(error, "تعذر الحذف؛ استخدم تعطيل المنتج."));
    } finally {
      setDeleteBusy(false);
    }
  };
  const toggleStatus = async () => {
    if (!statusTarget || statusBusy) return;
    setStatusBusy(true);
    setErrors([]);
    try {
      const r = await productsService.updateStatus(statusTarget.id, {
        is_active: !statusTarget.is_active,
      });
      setNotice(r.message);
      setStatusTarget(null);
      await load();
    } catch (e) {
      setStatusTarget(null);
      setErrors(apiMessages(e, "تعذر تحديث حالة المنتج."));
    } finally {
      setStatusBusy(false);
    }
  };
  return (
    <div className="products-page space-y-4" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-black text-gold-dark">إدارة الكتالوج</p>
          <h1 className="mt-1 text-3xl font-black text-brand">المنتجات</h1>
          <p className="mt-2 text-sm text-stone-500">
            إدارة المنتجات وأصنافها وحالتها.
          </p>
        </div>
        <button
          onClick={() => onNavigate("/owner/products/new")}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 font-black text-white"
        >
          <Plus className="h-4 w-4" />
          منتج جديد
        </button>
      </header>
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800">
          {notice}
        </div>
      )}
      <section className="rounded-2xl border bg-white p-4">
        <div className="products-quick-filters">
          <label>
            <span className="rep-label">البحث</span>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="rep-control pr-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="اسم المنتج أو الكود"
              />
            </span>
          </label>
          <RepSelect
            label="الحالة"
            value={active}
            onChange={change(setActive)}
            options={[
              { value: "", label: "الكل" },
              { value: "true", label: "فعال" },
              { value: "false", label: "غير فعال" },
            ]}
          />
          <button
            ref={filterTrigger}
            type="button"
            className="btn-outline products-filter-trigger"
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
              onClick={clear}
              className="text-sm font-bold text-brand"
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
            <RepSelect
              floating
              label="المخزون"
              value={stock}
              onChange={change(setStock)}
              options={[
                { value: "", label: "كل الحالات" },
                { value: "in_stock", label: "متوفر" },
                { value: "low_stock", label: "منخفض" },
                { value: "out_of_stock", label: "نفد" },
              ]}
            />
            <RepSelect
              floating
              label="الترتيب"
              value={sort}
              onChange={change(setSort)}
              options={[
                { value: "created_at:desc", label: "الأحدث" },
                { value: "created_at:asc", label: "الأقدم" },
                { value: "name:asc", label: "الاسم" },
                { value: "code:asc", label: "الكود" },
              ]}
            />
          </div>
        </CheckFiltersPopover>
        <div className="products-chips">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
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
          <div className="mt-3 flex flex-wrap justify-between gap-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800">
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
            className="mx-auto mt-2 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}
      <p className="text-xs text-stone-500">
        {pagination.total} منتج · صفحة {page} من{" "}
        {Math.max(1, pagination.total_pages)}
      </p>
      {loading ? (
        <div role="status">
          <span className="sr-only">جارٍ تحميل المنتجات…</span>
          <Skeleton className="h-96" />
        </div>
      ) : errors.length > 0 ? null : products.length === 0 ? (
        <EmptyState
          title={
            chips.length ? "لا توجد منتجات مطابقة" : "لا توجد منتجات حتى الآن"
          }
          action={
            <button
              className="btn-outline"
              onClick={
                chips.length ? clear : () => onNavigate("/owner/products/new")
              }
            >
              {chips.length ? "مسح الكل" : "منتج جديد"}
            </button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="products-table">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "المنتج",
                    "التصنيف",
                    "الحالة",
                    "الأصناف",
                    "المخزون",
                    "تاريخ الإضافة",
                    "الإجراء",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3 text-right text-stone-500">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    onOpen={() => onNavigate(`/owner/products/${p.id}/edit`)}
                    onStatus={() => setStatusTarget(p)}
                    onDelete={() => setDeleteTarget(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="products-cards lg:hidden">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={() => onNavigate(`/owner/products/${p.id}/edit`)}
                onStatus={() => setStatusTarget(p)}
                onDelete={() => setDeleteTarget(p)}
              />
            ))}
          </div>
        </>
      )}
      {pagination.total_pages > 1 &&
        createPortal(
          <div
            dir="rtl"
            className="products-pagination"
            role="navigation"
            aria-label="صفحات المنتجات"
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
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void deleteProduct()}
        loading={deleteBusy}
        severity="destructive"
        title="حذف المنتج نهائيًا"
        message={`حذف «${deleteTarget?.name ?? ""}»؟ يرفض النظام حذف أي منتج له مخزون أو تاريخ أعمال.`}
        confirmLabel="حذف نهائي"
      />
      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void toggleStatus()}
        loading={statusBusy}
        severity={statusTarget?.is_active ? "destructive" : "normal"}
        title={statusTarget?.is_active ? "تعطيل المنتج" : "تفعيل المنتج"}
        message={
          statusTarget?.is_active
            ? "لن يظهر المنتج غير الفعال في كتالوج الأونلاين أو الجملة. هل تريد المتابعة؟"
            : "هل تريد إعادة تفعيل هذا المنتج؟"
        }
        confirmLabel={statusTarget?.is_active ? "تعطيل" : "تفعيل"}
      />
    </div>
  );
}
function totalStock(p: ProductResponseDto) {
  return p.variants.reduce((sum, v) => sum + v.stock_quantity, 0);
}
function image(p: ProductResponseDto) {
  return resolveApiAssetUrl(
    p.images.find((x) => x.is_primary)?.url || p.images[0]?.url,
  );
}
function ProductImage({ product }: { product: ProductResponseDto }) {
  const src = image(product);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <ZoomableProductImage
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 rounded-xl object-cover"
    />
  ) : (
    <span className="grid h-12 w-12 place-items-center rounded-xl bg-stone-100">
      <ImageOff className="h-5 w-5 text-stone-400" />
    </span>
  );
}
function ProductRow({
  product,
  onOpen,
  onStatus,
  onDelete,
}: {
  product: ProductResponseDto;
  onOpen: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      aria-label={`فتح المنتج ${product.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductImage product={product} />
          <div>
            <b className="block text-brand">{product.name}</b>
            <small dir="ltr">{product.code}</small>
          </div>
        </div>
      </td>
      <td className="px-4">{product.category.name}</td>
      <td className="px-4">
        <Status active={product.is_active} />
      </td>
      <td className="px-4 font-bold">{product.variants.length}</td>
      <td className="px-4 text-lg font-black">{totalStock(product)}</td>
      <td className="px-4 whitespace-nowrap">
        {formatOrderDate(product.created_at)}
      </td>
      <td className="px-4">
        <div className="products-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="عرض وتعديل"
          >
            <Eye className="h-4 w-4" />
          </button>
          <ProductStatusAction product={product} onClick={onStatus} />
          <ProductDeleteAction product={product} onClick={onDelete} />
        </div>
      </td>
    </tr>
  );
}
function ProductCard({
  product,
  onOpen,
  onStatus,
  onDelete,
}: {
  product: ProductResponseDto;
  onOpen: () => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4">
      <button
        type="button"
        onClick={onOpen}
        className="products-card-identity flex gap-3"
      >
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <b className="products-name text-brand">{product.name}</b>
            <Status active={product.is_active} />
          </div>
          <p className="text-xs text-stone-500">
            {product.code} · {product.category.name}
          </p>
        </div>
      </button>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-center text-xs">
        <span>
          الأصناف<b className="block text-lg">{product.variants.length}</b>
        </span>
        <span>
          المخزون<b className="block text-lg">{totalStock(product)}</b>
        </span>
      </div>
      <div className="products-actions mt-3 flex gap-2">
        <button
          onClick={onOpen}
          className="min-h-11 flex-1 rounded-xl bg-brand font-black text-white"
        >
          عرض وتعديل
        </button>
        <ProductStatusAction product={product} onClick={onStatus} mobile />
        <ProductDeleteAction product={product} onClick={onDelete} />
      </div>
    </article>
  );
}
function ProductDeleteAction({
  product,
  onClick,
}: {
  product: ProductResponseDto;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="products-delete-action"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={`حذف نهائي ${product.name}`}
      title="حذف نهائي"
    >
      <Trash2 size={16} />
    </button>
  );
}
function ProductStatusAction({
  product,
  onClick,
  mobile = false,
}: {
  product: ProductResponseDto;
  onClick: () => void;
  mobile?: boolean;
}) {
  const Icon = product.is_active ? PowerOff : Power;
  const label = product.is_active ? "تعطيل" : "تفعيل";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} ${product.name}`}
      title={label}
      className={`products-status-action inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${mobile ? "min-h-11 flex-1" : "min-h-9"} ${product.is_active ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100" : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
    </button>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}
    >
      {active ? "فعال" : "غير فعال"}
    </span>
  );
}
