import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, ImageOff, Plus, RefreshCw, Search } from "lucide-react";
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
          setProducts(r.products);
          setPagination(r.pagination);
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
    setActive("");
    setStock("");
    setSort("created_at:desc");
    setPage(1);
  };
  const toggleStatus = async () => {
    if (!statusTarget) return;
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-black text-gold-dark">إدارة الكتالوج</p>
          <h1 className="mt-1 text-3xl font-black text-brand">المنتجات</h1>
          <p className="mt-2 text-sm text-stone-500">
            عرض وإدارة المنتجات والخيارات من بيانات النظام الفعلية.
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
        <form
          onSubmit={submit}
          className="grid items-end gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
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
            label="الحالة"
            value={active}
            onChange={change(setActive)}
            options={[
              { value: "", label: "الكل" },
              { value: "true", label: "فعال" },
              { value: "false", label: "غير فعال" },
            ]}
          />
          <RepSelect
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
          <button className="min-h-11 rounded-xl bg-brand px-5 font-black text-white">
            بحث
          </button>
        </form>
        {(search ||
          query ||
          category ||
          color ||
          active ||
          stock ||
          sort !== "created_at:desc") && (
          <button
            type="button"
            onClick={clear}
            className="mt-3 text-xs font-black text-gold-dark"
          >
            مسح الفلاتر
          </button>
        )}
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
        <div className="rep-error text-center">
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
      {loading ? (
        <Skeleton className="h-96" />
      ) : products.length === 0 ? (
        <EmptyState title="لا توجد منتجات مطابقة" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "المنتج",
                    "التصنيف",
                    "الحالة",
                    "الخيارات",
                    "إجمالي المخزون",
                    "تاريخ الإنشاء",
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
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={() => onNavigate(`/owner/products/${p.id}/edit`)}
                onStatus={() => setStatusTarget(p)}
              />
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
  return src ? (
    <img src={src} alt="" className="h-12 w-12 rounded-xl object-cover" />
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
}: {
  product: ProductResponseDto;
  onOpen: () => void;
  onStatus: () => void;
}) {
  return (
    <tr>
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
        <div className="flex gap-2">
          <button
            onClick={onOpen}
            className="rounded-lg bg-brand p-2 text-white"
            aria-label="عرض وتعديل"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={onStatus}
            className="text-xs font-black text-gold-dark"
          >
            {product.is_active ? "تعطيل" : "تفعيل"}
          </button>
        </div>
      </td>
    </tr>
  );
}
function ProductCard({
  product,
  onOpen,
  onStatus,
}: {
  product: ProductResponseDto;
  onOpen: () => void;
  onStatus: () => void;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4">
      <div className="flex gap-3">
        <ProductImage product={product} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2">
            <b className="truncate text-brand">{product.name}</b>
            <Status active={product.is_active} />
          </div>
          <p className="text-xs text-stone-500">
            {product.code} · {product.category.name}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3 text-center text-xs">
        <span>
          الخيارات<b className="block text-lg">{product.variants.length}</b>
        </span>
        <span>
          المخزون<b className="block text-lg">{totalStock(product)}</b>
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onOpen}
          className="min-h-11 flex-1 rounded-xl bg-brand font-black text-white"
        >
          عرض وتعديل
        </button>
        <button
          onClick={onStatus}
          className="min-h-11 rounded-xl border px-4 font-bold"
        >
          {product.is_active ? "تعطيل" : "تفعيل"}
        </button>
      </div>
    </article>
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
