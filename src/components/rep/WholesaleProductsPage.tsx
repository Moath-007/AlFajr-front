import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Loader2,
  PackageOpen,
  ShoppingCart,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import {
  categoriesService,
  authService,
  colorsService,
  productsService,
  resolveApiAssetUrl,
  type CatalogProductSummaryDto,
  type CatalogProductDetailsDto,
  type CatalogSort,
  type CategoryResponseDto,
  type ColorResponseDto,
} from "@/api";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useWholesaleCart, useWholesaleStockVisibility } from "@/rep";
import { RepSearchField, RepSelect } from "./RepFormControls";
import Modal from "@/components/ui/Modal";

import { createPortal } from "react-dom";
import CheckFiltersPopover from "@/components/finance/CheckFiltersPopover";

interface Props {
  onNavigate: (path: string) => void;
}
const PAGE_SIZE = 20;

export default function WholesaleProductsPage({ onNavigate }: Props) {
  const { totalQuantity } = useWholesaleCart();
  const {
    showWholesaleStock: showStock,
    showStock: unlockStock,
    hideStock,
  } = useWholesaleStockVisibility();
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preview, setPreview] = useState<CatalogProductSummaryDto | null>(null);
  const [products, setProducts] = useState<CatalogProductSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const nextPage = useRef(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [colorId, setColorId] = useState("");
  const [sort, setSort] = useState<CatalogSort>("default");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [filterWarnings, setFilterWarnings] = useState<string[]>([]);
  const [stockDetails, setStockDetails] = useState<
    Record<number, CatalogProductDetailsDto["variants"]>
  >({});
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || verifying) return;
    setVerifying(true);
    setUnlockError("");
    try {
      const response = await authService.verifyCurrentPassword(password);
      if (!response.verified) {
        hideStock();
        setUnlockError("كلمة المرور غير صحيحة");
        return;
      }
      unlockStock();
      setUnlockOpen(false);
      setPassword("");
    } catch (error) {
      hideStock();
      const messages = apiMessages(error, "تعذر التحقق من كلمة المرور.");
      setUnlockError(
        messages.some((message) => /غير صحيحة|401|Unauthorized/i.test(message))
          ? "كلمة المرور غير صحيحة"
          : messages.join("، "),
      );
    } finally {
      setVerifying(false);
    }
  };
  useEffect(() => {
    if (!showStock || products.length === 0) {
      if (!showStock) setStockDetails({});
      return;
    }
    const controller = new AbortController();
    Promise.all(
      products.map((product) =>
        productsService.getWholesaleById(product.id, controller.signal),
      ),
    )
      .then((details) => {
        if (!controller.signal.aborted)
          setStockDetails(
            Object.fromEntries(
              details.map(({ product }) => [product.id, product.variants]),
            ),
          );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrors(apiMessages(error, "تعذر تحميل تفاصيل المخزون."));
      });
    return () => controller.abort();
  }, [products, showStock]);

  const loadFilters = useCallback(async (signal?: AbortSignal) => {
    setFilterWarnings([]);
    const [categoryResult, colorResult] = await Promise.allSettled([
      categoriesService.list(signal),
      colorsService.list(signal),
    ]);
    if (signal?.aborted) return;
    const warnings: string[] = [];
    if (categoryResult.status === "fulfilled")
      setCategories(categoryResult.value.filter((item) => item.is_active));
    else
      warnings.push(
        ...apiMessages(categoryResult.reason, "تعذر تحميل التصنيفات."),
      );
    if (colorResult.status === "fulfilled") setColors(colorResult.value);
    else
      warnings.push(...apiMessages(colorResult.reason, "تعذر تحميل الألوان."));
    setFilterWarnings(warnings);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadFilters(controller.signal);
    return () => controller.abort();
  }, [loadFilters]);
  const fetchBatch = useCallback(
    async (batch: number, version: number) => {
      if (inFlight.current) return;
      const controller = new AbortController();
      request.current = controller;
      inFlight.current = true;
      if (batch === 1) setLoading(true);
      else setLoadingMore(true);
      setMoreError(false);
      try {
        const response = await productsService.listWholesale(
          {
            page: batch,
            limit: PAGE_SIZE,
            search: submittedSearch || undefined,
            category_id: categoryId ? Number(categoryId) : undefined,
            color_id: colorId ? Number(colorId) : undefined,
            sort,
          },
          controller.signal,
        );
        if (controller.signal.aborted || version !== generation.current) return;
        setProducts((previous) => {
          const unique = new Map(
            (batch === 1 ? [] : previous).map((product) => [
              product.id,
              product,
            ]),
          );
          response.products.forEach((product) =>
            unique.set(product.id, product),
          );
          return [...unique.values()];
        });
        nextPage.current = batch + 1;
        setHasMore(
          response.products.length > 0 &&
            response.pagination.page < response.pagination.total_pages,
        );
      } catch (error) {
        if (controller.signal.aborted || version !== generation.current) return;
        if (batch === 1)
          setErrors(apiMessages(error, "تعذر تحميل منتجات الجملة."));
        else setMoreError(true);
      } finally {
        if (version === generation.current && !controller.signal.aborted) {
          inFlight.current = false;
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [categoryId, colorId, sort, submittedSearch],
  );
  useEffect(() => {
    request.current?.abort();
    const version = ++generation.current;
    inFlight.current = false;
    nextPage.current = 1;
    setProducts([]);
    setErrors([]);
    setHasMore(false);
    setLoadingMore(false);
    void fetchBatch(1, version);
    return () => request.current?.abort();
  }, [fetchBatch]);
  useEffect(() => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      moreError ||
      filtersOpen ||
      preview ||
      unlockOpen
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting))
          void fetchBatch(nextPage.current, generation.current);
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    if (sentinel.current) observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [
    fetchBatch,
    hasMore,
    loading,
    loadingMore,
    moreError,
    filtersOpen,
    preview,
    unlockOpen,
  ]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmittedSearch(search.trim());
  };
  const clear = () => {
    setSearch("");
    setSubmittedSearch("");
    setCategoryId("");
    setColorId("");
    setSort("default");
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-black text-gold-dark">كتالوج المندوب</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-brand">
            منتجات الجملة
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            الأسعار والخصومات المعروضة خاصة بالجملة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (showStock) {
                hideStock();
                setStockDetails({});
              } else setUnlockOpen(true);
            }}
            className="btn-outline"
          >
            <Lock className="h-4 w-4" />{" "}
            {showStock ? "إخفاء المخزون" : "إظهار المخزون"}
          </button>
          <button
            onClick={() => onNavigate("/rep/orders/new")}
            className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-black text-white"
          >
            <ShoppingCart className="h-5 w-5" /> مراجعة الطلب{" "}
            {totalQuantity > 0 && (
              <span className="rounded-full bg-gold px-2 text-brand">
                {totalQuantity}
              </span>
            )}
          </button>
        </div>
      </header>
      <section className="sticky top-20 z-20 hidden lg:block overflow-visible rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_10px_35px_-28px_rgba(22,46,33,.5)]">
        <form
          onSubmit={submit}
          className="grid items-end gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_190px_auto]"
        >
          <RepSearchField
            value={search}
            onChange={setSearch}
            placeholder="ابحث بالاسم أو الكود"
            label="البحث"
          />
          <RepSelect
            label="التصنيف"
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
            }}
            options={[
              { value: "", label: "كل التصنيفات" },
              ...categories.map((item) => ({
                value: String(item.category_id),
                label: item.name,
              })),
            ]}
          />
          <RepSelect
            label="اللون"
            value={colorId}
            onChange={(value) => {
              setColorId(value);
            }}
            options={[
              { value: "", label: "كل الألوان" },
              ...colors.map((item) => ({
                value: String(item.color_id),
                label: item.name,
              })),
            ]}
          />
          <RepSelect
            label="الترتيب"
            value={sort}
            onChange={(value) => {
              setSort(value);
            }}
            options={[
              { value: "default", label: "الترتيب الافتراضي" },
              { value: "price_asc", label: "السعر: الأقل أولًا" },
              { value: "price_desc", label: "السعر: الأعلى أولًا" },
            ]}
          />
          <button className="min-h-11 rounded-xl bg-brand px-5 text-sm font-black text-white transition hover:bg-brand-700">
            بحث
          </button>
        </form>
        {(submittedSearch || categoryId || colorId || sort !== "default") && (
          <button
            onClick={clear}
            className="mt-3 text-xs font-bold text-gold-dark hover:text-brand"
          >
            مسح جميع الفلاتر
          </button>
        )}
        {filterWarnings.length > 0 && (
          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900"
            role="status"
          >
            <span>
              {filterWarnings.join("، ")} يمكنك متابعة استخدام المنتجات.
            </span>
            <button
              type="button"
              onClick={() => void loadFilters()}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </section>
      <form
        onSubmit={submit}
        className="grid grid-cols-[1fr_auto] items-end gap-2 lg:hidden"
      >
        <RepSearchField
          value={search}
          onChange={setSearch}
          placeholder="ابحث بالاسم أو الكود"
        />
        <button className="btn-outline">بحث</button>
      </form>
      {createPortal(
        <button
          ref={filterTrigger}
          type="button"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
          className="fixed bottom-5 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-brand shadow-lg lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> الفلاتر
        </button>,
        document.body,
      )}
      <CheckFiltersPopover
        neutral
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        trigger={filterTrigger}
        footer={
          <button type="button" onClick={clear} className="btn-outline">
            مسح الفلاتر
          </button>
        }
      >
        <div className="space-y-3">
          {" "}
          <RepSelect
            floating
            label="التصنيف"
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
            }}
            options={[
              { value: "", label: "كل التصنيفات" },
              ...categories.map((item) => ({
                value: String(item.category_id),
                label: item.name,
              })),
            ]}
          />
          <RepSelect
            floating
            label="اللون"
            value={colorId}
            onChange={(value) => {
              setColorId(value);
            }}
            options={[
              { value: "", label: "كل الألوان" },
              ...colors.map((item) => ({
                value: String(item.color_id),
                label: item.name,
              })),
            ]}
          />
          <RepSelect
            floating
            label="الترتيب"
            value={sort}
            onChange={(value) => {
              setSort(value);
            }}
            options={[
              { value: "default", label: "الترتيب الافتراضي" },
              { value: "price_asc", label: "السعر: الأقل أولًا" },
              { value: "price_desc", label: "السعر: الأعلى أولًا" },
            ]}
          />
        </div>
      </CheckFiltersPopover>
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "صورة المنتج"}
        size="xl"
      >
        {preview && (
          <img
            src={resolveApiAssetUrl(preview.primary_image?.url) ?? undefined}
            alt={preview.name}
            className="mx-auto max-h-[75dvh] w-full object-contain"
          />
        )}
      </Modal>
      {errors.length > 0 && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center font-bold text-red-800"
          role="alert"
        >
          {errors.join("، ")}
        </div>
      )}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white">
          <EmptyState
            title="لا توجد منتجات مطابقة"
            description="جرّب تغيير البحث أو الفلاتر الحالية."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showStock={showStock}
              variants={stockDetails[product.id]}
              onPreview={() => setPreview(product)}
              onOpen={() => onNavigate(`/rep/products/${product.id}`)}
            />
          ))}
        </div>
      )}
      <Modal
        open={unlockOpen}
        onClose={() => {
          if (!verifying) {
            setUnlockOpen(false);
            setPassword("");
            setUnlockError("");
          }
        }}
        title="إظهار المخزون"
      >
        <form
          onSubmit={(event) => void verifyPassword(event)}
          className="space-y-4"
        >
          <p className="text-sm text-stone-600">
            أدخل كلمة مرور المندوب لإظهار المخزون.
          </p>
          <label>
            <span className="rep-label">كلمة المرور</span>
            <input
              autoComplete="current-password"
              type="password"
              className="rep-control"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={verifying}
            />
          </label>
          {unlockError && (
            <div role="alert" className="rep-error">
              {unlockError}
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1"
              disabled={!password || verifying}
            >
              {verifying ? "جاري التحقق…" : "تحقق"}
            </button>
            <button
              type="button"
              className="btn-outline"
              disabled={verifying}
              onClick={() => {
                setUnlockOpen(false);
                setPassword("");
                setUnlockError("");
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
      <div
        ref={sentinel}
        className="flex min-h-12 items-center justify-center gap-2 text-sm text-stone-500"
        role="status"
        aria-live="polite"
      >
        {loadingMore ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل المزيد...
          </>
        ) : moreError ? (
          <>
            <span>تعذر تحميل المزيد</span>
            <button
              type="button"
              className="btn-outline"
              onClick={() =>
                void fetchBatch(nextPage.current, generation.current)
              }
            >
              إعادة المحاولة
            </button>
          </>
        ) : !loading && !hasMore && products.length > 0 ? (
          "تم عرض جميع المنتجات"
        ) : null}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onOpen,
  onPreview,
  showStock,
  variants,
}: {
  product: CatalogProductSummaryDto;
  onOpen: () => void;
  onPreview: () => void;
  showStock: boolean;
  variants?: CatalogProductDetailsDto["variants"];
}) {
  const image = resolveApiAssetUrl(product.primary_image?.url);
  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white text-right shadow-sm transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gold/30">
      <button
        type="button"
        onClick={onPreview}
        disabled={!image}
        aria-label={`عرض الصورة كاملة · ${product.name}`}
        className="relative block aspect-square w-full overflow-hidden bg-stone-100 focus-visible:ring-2 focus-visible:ring-gold"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center">
            <PackageOpen className="h-7 w-7 text-stone-300" />
          </span>
        )}
        {showStock && (
          <span className="absolute right-2 top-2 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800 shadow-sm">
            متاح للطلب
          </span>
        )}
        {product.has_discount && (
          <span className="absolute left-0 top-2.5 rounded-r-md bg-red-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
            خصم
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full p-3 text-right focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span className="flex min-w-0 items-center justify-between gap-2">
          <small className="truncate text-[11px] font-bold text-stone-400">
            {product.category.name}
          </small>
          <span
            dir="ltr"
            className="shrink-0 text-[10px] font-bold text-stone-400"
          >
            {product.code}
          </span>
        </span>
        <strong className="mt-1.5 block min-h-10 line-clamp-2 text-sm font-black leading-5 text-brand">
          {product.name}
        </strong>
        <span className="mt-2.5 block border-t border-stone-100 pt-2.5 text-sm font-black text-gold-dark">
          يبدأ من {formatMoney(product.price)}
        </span>
        {showStock && variants && (
          <span className="mt-2 block space-y-1 rounded-lg bg-stone-50 p-2 text-xs text-stone-700">
            {variants.map((variant) => (
              <span key={variant.id} className="flex justify-between gap-2">
                <span>
                  {variant.color.name} / {variant.size}
                </span>
                <b>الرصيد الحالي: {variant.stock_quantity}</b>
              </span>
            ))}
          </span>
        )}
      </button>
    </article>
  );
}
