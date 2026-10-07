import CheckFiltersPopover from '@/components/finance/CheckFiltersPopover';
import { formatCatalogPrice as formatPrice } from '@/public/formatPrice';
import { createPortal } from "react-dom";
import Modal from "@/components/ui/Modal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  PackageOpen,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ApiError,
  productsService,
  resolveApiAssetUrl,
  type CatalogPaginationDto,
  type CatalogProductSummaryDto,
  type CatalogSort,
} from "@/api";
import { usePublicCatalog } from "@/public/usePublicCatalog";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import PublicSelect from "./PublicSelect";

const DEFAULT_LIMIT = 12;
const emptyPagination: CatalogPaginationDto = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  total_pages: 0,
};

export default function ProductsPage() {
  const {
    categories,
    colors,
    categoriesStatus,
    colorsStatus,
    categoriesErrors,
    colorsErrors,
    reloadCategories,
    reloadColors,
    ensureCategories,
    ensureColors,
  } = usePublicCatalog();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get("search") ?? "";
  const categoryId = parsePositiveInteger(searchParams.get("category_id"));
  const colorId = parsePositiveInteger(searchParams.get("color_id"));

  const sort = parseSort(searchParams.get("sort"));
  const [searchInput, setSearchInput] = useState(searchParam);
  const [products, setProducts] = useState<CatalogProductSummaryDto[]>([]);
  const [pagination, setPagination] =
    useState<CatalogPaginationDto>(emptyPagination);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const filterTrigger=useRef<HTMLButtonElement>(null);
  const [imagePreview, setImagePreview] =
    useState<CatalogProductSummaryDto | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const nextPage = useRef(1);

  useEffect(() => {
    ensureCategories();
    ensureColors();
  }, [ensureCategories, ensureColors]);

  const updateParams = useCallback(
    (updates: Record<string, string | number | null>, replace = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(updates).forEach(([key, value]) => {
            if (
              value === null ||
              value === "" ||
              value === "default" ||
              (key === "page" && value === 1)
            )
              next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== searchParam)
        updateParams({ search: normalized || null, page: null });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchParam, updateParams]);

  useEffect(() => {
    const token = ++generation.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlight.current = true;
    nextPage.current = 1;
    setProducts([]);
    setPagination(emptyPagination);
    setStatus("loading");
    setErrors([]);
    setLoadingMore(false);
    setMoreError(false);
    setHasMore(false);
    productsService
      .listRetail(
        {
          page: 1,
          limit: DEFAULT_LIMIT,
          search: searchParam || undefined,
          category_id: categoryId,
          color_id: colorId,
          sort,
        },
        controller.signal,
      )
      .then((response) => {
        if (controller.signal.aborted || token !== generation.current) return;
        const unique = Array.from(
          new Map(response.products.map((p) => [p.id, p])).values(),
        );
        setProducts(unique);
        setPagination(response.pagination);
        nextPage.current = 2;
        setHasMore(
          response.products.length > 0 &&
            response.pagination.page < response.pagination.total_pages,
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || token !== generation.current) return;
        setErrors(
          error instanceof ApiError
            ? error.messages
            : ["تعذر تحميل المنتجات حاليًا."],
        );
        setStatus("error");
      })
      .finally(() => {
        if (token === generation.current) inFlight.current = false;
      });
    return () => {
      controller.abort();
      controllerRef.current?.abort();
      generation.current = token + 1;
    };
  }, [searchParam, categoryId, colorId, sort, requestVersion]);
  const loadMore = useCallback(() => {
    if (
      inFlight.current ||
      !hasMore ||
      status !== "ready" ||
      showFilters ||
      imagePreview
    )
      return;
    inFlight.current = true;
    setLoadingMore(true);
    setMoreError(false);
    const token = generation.current,
      page = nextPage.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    productsService
      .listRetail(
        {
          page,
          limit: DEFAULT_LIMIT,
          search: searchParam || undefined,
          category_id: categoryId,
          color_id: colorId,
          sort,
        },
        controller.signal,
      )
      .then((response) => {
        if (controller.signal.aborted || token !== generation.current) return;
        setProducts((current) => {
          const seen = new Set(current.map((p) => p.id));
          return [
            ...current,
            ...response.products.filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            }),
          ];
        });
        setPagination(response.pagination);
        nextPage.current = page + 1;
        setHasMore(
          response.products.length > 0 &&
            response.pagination.page < response.pagination.total_pages,
        );
      })
      .catch(() => {
        if (!controller.signal.aborted && token === generation.current)
          setMoreError(true);
      })
      .finally(() => {
        if (token === generation.current) {
          inFlight.current = false;
          setLoadingMore(false);
        }
      });
  }, [
    hasMore,
    status,
    showFilters,
    imagePreview,
    searchParam,
    categoryId,
    colorId,
    sort,
  ]);
  useEffect(() => {
    if (
      status !== "ready" ||
      !hasMore ||
      loadingMore ||
      moreError ||
      showFilters ||
      imagePreview ||
      !sentinel.current
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [
    status,
    hasMore,
    loadingMore,
    moreError,
    showFilters,
    imagePreview,
    loadMore,
  ]);

  const activeFilters =
    Number(categoryId !== undefined) + Number(colorId !== undefined);
  const clearFilters = () =>
    updateParams({ category_id: null, color_id: null, sort: null, page: null });

  const filters = (
    <div className="space-y-6">
      <PublicSelect
        label="التصنيف"
        allLabel="الكل"
        value={categoryId ? String(categoryId) : ""}
        disabled={categoriesStatus !== "ready"}
        onChange={(value) =>
          updateParams({ category_id: value || null, page: null })
        }
        options={categories.map((category) => ({
          value: String(category.category_id),
          label: `${category.name} (${category.products_count})`,
        }))}
      />
      {categoriesStatus === "error" && (
        <FilterError messages={categoriesErrors} onRetry={reloadCategories} />
      )}
      <PublicSelect
        label="اللون"
        allLabel="الكل"
        value={colorId ? String(colorId) : ""}
        disabled={colorsStatus !== "ready"}
        onChange={(value) =>
          updateParams({ color_id: value || null, page: null })
        }
        options={colors.map((color) => ({
          value: String(color.color_id),
          label: color.name,
        }))}
      />
      {colorsStatus === "error" && (
        <FilterError messages={colorsErrors} onRetry={reloadColors} />
      )}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 lg:pb-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-extrabold text-[#C2A66D]">الكتالوج</p>
        <h1 className="mt-1.5 text-2xl font-black text-[#162E21] sm:text-3xl">
          المنتجات
        </h1>
        <p className="mt-1.5 text-sm text-stone-500">
          ابحث وصفِّ النتائج للوصول إلى المنتج المناسب.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="ابحث باسم المنتج أو الكود…"
            className="w-full rounded-xl border border-stone-200 bg-white py-3 pe-12 ps-11 text-sm font-semibold outline-none transition focus:border-[#C2A66D] focus:ring-4 focus:ring-[#C2A66D]/10"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              aria-label="مسح البحث"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <PublicSelect
          ariaLabel="ترتيب المنتجات"
          value={sort}
          onChange={(value) => updateParams({ sort: value, page: null })}
          className="sm:w-56"
          options={[
            { value: "default", label: "الترتيب الافتراضي" },
            { value: "price_asc", label: "السعر: الأقل أولًا" },
            { value: "price_desc", label: "السعر: الأعلى أولًا" },
          ]}
        />
        {!imagePreview &&
          createPortal(
            <button
              ref={filterTrigger} aria-expanded={showFilters} aria-label="فتح فلاتر المنتجات" onClick={() => setShowFilters(v=>!v)}
              className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-bold text-[#162E21] shadow-lg lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> الفلاتر{" "}
              {activeFilters > 0 && (
                <span className="rounded-full bg-[#C2A66D] px-2 py-0.5 text-xs text-[#162E21]">
                  {activeFilters}
                </span>
              )}
            </button>,
            document.body,
          )}{" "}
      </div>

      <div className="grid gap-7 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-black text-[#162E21]">تصفية النتائج</h2>
              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-[#C2A66D]"
                >
                  مسح الكل
                </button>
              )}
            </div>
            {filters}
          </div>
        </aside>
        <section>
          <div className="mb-4 min-h-6 text-sm font-semibold text-stone-500">
            {status === "ready" && pagination.total > 0
              ? `${pagination.total} منتج`
              : status === "ready"
                ? "لا توجد نتائج"
                : ""}
          </div>
          {status === "loading" && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          )}
          {status === "error" && (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-900"
              role="alert"
            >
              <p className="font-bold">{errors.join("، ")}</p>
              <button
                onClick={() => setRequestVersion((version) => version + 1)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm"
              >
                <RefreshCw className="h-4 w-4" /> إعادة المحاولة
              </button>
            </div>
          )}
          {status === "ready" && products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-stone-300" />
              <h2 className="mt-4 font-black text-[#162E21]">
                لا توجد منتجات مطابقة
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                جرّب تغيير البحث أو الفلاتر.
              </p>
              {(activeFilters > 0 || searchParam) && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    updateParams({
                      search: null,
                      category_id: null,
                      color_id: null,
                      sort: null,
                      page: null,
                    });
                  }}
                  className="mt-5 rounded-xl border border-[#162E21]/20 px-4 py-2 text-sm font-bold text-[#162E21]"
                >
                  مسح البحث والفلاتر
                </button>
              )}
            </div>
          )}
          {status === "ready" && products.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <CatalogCard
                  key={product.id}
                  product={product}
                  onPreview={() => setImagePreview(product)}
                  returnTo={`${location.pathname}${location.search}`}
                />
              ))}
            </div>
          )}
          {status === "ready" && (
            <div
              ref={sentinel}
              className="mt-6 flex min-h-12 items-center justify-center gap-2 text-sm text-stone-500"
              aria-live="polite"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> جاري
                  تحميل المزيد...
                </>
              ) : moreError ? (
                <div role="alert" className="flex items-center gap-3">
                  <span>تعذر تحميل المزيد</span>
                  <button
                    onClick={loadMore}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 font-bold text-[#162E21]"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : !hasMore && products.length > 0 ? (
                <span className="text-xs text-stone-400">
                  تم عرض جميع المنتجات
                </span>
              ) : null}
            </div>
          )}
        </section>
      </div>

      {imagePreview && (
        <Modal
          open
          onClose={() => setImagePreview(null)}
          title={imagePreview.name}
          size="xl"
        >
          <img
            src={
              resolveApiAssetUrl(imagePreview.primary_image?.url) ?? undefined
            }
            alt={imagePreview.name}
            className="mx-auto max-h-[75dvh] w-full object-contain"
          />
        </Modal>
      )}
      <CheckFiltersPopover neutral open={showFilters} trigger={filterTrigger} onClose={()=>setShowFilters(false)} footer={<button onClick={clearFilters} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">مسح الفلاتر</button>}>{filters}</CheckFiltersPopover>
    </main>
  );
}

function CatalogCard({
  product,
  returnTo,
  onPreview,
}: {
  product: CatalogProductSummaryDto;
  returnTo: string;
  onPreview: () => void;
}) {
  const image = resolveApiAssetUrl(product.primary_image?.url);
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white text-right shadow-sm transition hover:-translate-y-1 hover:border-[#C2A66D]/50 hover:shadow-xl">
        <button type="button" onClick={onPreview} disabled={!image} aria-label={"عرض الصورة كاملة · "+product.name} className="relative block aspect-[4/3] w-full overflow-hidden bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C2A66D] disabled:cursor-default">
          {image ? (
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center">
              <PackageOpen className="h-9 w-9 text-stone-300" />
            </span>
          )}
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#C2A66D]/45 bg-[#FFFCF5]/95 px-2.5 py-1 text-xs font-black text-[#162E21] shadow-md backdrop-blur-sm">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-[#C2A66D]"
            />
            متاح للطلب
          </span>
          {product.has_discount && (
            <span className="absolute -left-10 top-4 w-36 -rotate-45 border-y border-white/40 bg-gradient-to-r from-[#851B18] via-[#B42318] to-[#D1493F] py-1.5 text-center text-xs font-black tracking-wide text-white shadow-[0_5px_14px_rgba(87,18,15,0.38)]">
              خصم
            </span>
          )}
        </button>
      <Link
        to={`/products/${product.id}`}
        state={{ catalogReturnTo: returnTo }}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C2A66D]"
      >
        <span className="block p-3.5">
          <span className="text-xs font-bold text-stone-400">
            {product.category.name}
          </span>
          <span className="mt-1 block text-sm font-black leading-6 text-[#162E21] sm:text-base">
            {product.name}
          </span>
          <span className="mt-0.5 block text-xs text-stone-400">
            {product.code}
          </span>
          <span className="mt-3 block text-base font-black text-[#C2A66D] sm:text-lg">
            {formatPrice(product.price)}
          </span>
        </span>
      </Link>

    </article>
  );
}

function FilterError({
  messages,
  onRetry,
}: {
  messages: string[];
  onRetry: () => void;
}) {
  return (
    <div className="-mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
      <p>{messages.join("، ")}</p>
      <button onClick={onRetry} className="mt-2 underline">
        إعادة المحاولة
      </button>
    </div>
  );
}
function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
function parseSort(value: string | null): CatalogSort {
  return value === "price_asc" || value === "price_desc" ? value : "default";
}
