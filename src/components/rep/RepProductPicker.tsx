import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  PackageOpen,
  ShoppingCart,
} from "lucide-react";
import {
  categoriesService,
  colorsService,
  productsService,
  resolveApiAssetUrl,
  type CatalogPaginationDto,
  type CatalogProductDetailsDto,
  type CatalogProductSummaryDto,
  type CatalogSort,
  type CategoryResponseDto,
  type ColorResponseDto,
} from "@/api";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { RepSearchField, RepSelect } from "./RepFormControls";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { useOptionalWholesaleStockVisibility } from "@/rep";
import QuantityInput from "@/components/ui/QuantityInput";

export interface PickedOrderItem {
  product_variant_id: number;
  quantity: number;
  label: string;
  stock: number;
  display_price?: string;
  original_price?: string;
  display_discount?: string;
}

const emptyPagination: CatalogPaginationDto = {
  page: 1,
  limit: 12,
  total: 0,
  total_pages: 0,
};

export default function RepProductPicker({
  open,
  existing,
  onClose,
  onAdd,
  priceMode = "wholesale",
  allowOutOfStock = false,
}: {
  open: boolean;
  existing: Array<{ product_variant_id: number; quantity: number }>;
  onClose: () => void;
  onAdd: (item: PickedOrderItem) => void;
  priceMode?: "retail" | "wholesale";
  allowOutOfStock?: boolean;
}) {
  const stockVisibility = useOptionalWholesaleStockVisibility();
  const showWholesaleStock = stockVisibility?.showWholesaleStock ?? true;
  const [products, setProducts] = useState<CatalogProductSummaryDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [colorId, setColorId] = useState("");
  const [sort, setSort] = useState<CatalogSort>("default");
  const [details, setDetails] = useState<CatalogProductDetailsDto | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open || categories.length || colors.length) return;
    const controller = new AbortController();
    Promise.all([
      categoriesService.list(controller.signal),
      colorsService.list(controller.signal),
    ])
      .then(([categoryData, colorData]) => {
        setCategories(categoryData.filter((item) => item.is_active));
        setColors(colorData);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrors(apiMessages(error, "تعذر تحميل خيارات الفلترة."));
      });
    return () => controller.abort();
  }, [categories.length, colors.length, open]);

  const loadProducts = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      const request =
        priceMode === "retail"
          ? productsService.listRetail
          : productsService.listWholesale;
      return request(
        {
          page,
          limit: 12,
          search: submittedSearch || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          color_id: colorId ? Number(colorId) : undefined,
          sort,
        },
        signal,
      )
        .then((response) => {
          setProducts(response.products);
          setPagination(response.pagination);
        })
        .catch((error) => {
          if (!signal?.aborted)
            setErrors(apiMessages(error, "تعذر تحميل منتجات الجملة."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [categoryId, colorId, page, priceMode, sort, submittedSearch],
  );

  useEffect(() => {
    if (!open || details) return;
    const controller = new AbortController();
    void loadProducts(controller.signal);
    return () => controller.abort();
  }, [details, loadProducts, open]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  };
  const openProduct = async (id: number) => {
    setDetailsLoading(true);
    setErrors([]);
    try {
      const getProduct =
        priceMode === "retail"
          ? productsService.getRetailById
          : productsService.getWholesaleById;
      const product = (await getProduct(id)).product;
      setDetails(product);
      const available = product.variants.find(
        (variant) => allowOutOfStock || variant.stock_quantity > 0,
      );
      setVariantId(available?.id ?? null);
      setQuantity(1);
    } catch (error) {
      setErrors(apiMessages(error, "تعذر تحميل خيارات المنتج."));
    } finally {
      setDetailsLoading(false);
    }
  };
  const variant = details?.variants.find((item) => item.id === variantId);
  const current = variant
    ? existing.find((item) => item.product_variant_id === variant.id)
    : undefined;
  const availableToAdd = variant
    ? allowOutOfStock ? Number.MAX_SAFE_INTEGER : Math.max(0, variant.stock_quantity - (current?.quantity ?? 0))
    : 0;
  const closePicker = () => {
    setDetails(null);
    setVariantId(null);
    setQuantity(1);
    onClose();
  };
  const add = () => {
    if (!details || !variant || quantity < 1 || quantity > availableToAdd)
      return;
    onAdd({
      product_variant_id: variant.id,
      quantity,
      stock: allowOutOfStock ? Number.MAX_SAFE_INTEGER : variant.stock_quantity,
      original_price: variant.price,
      display_discount: variant.discount,
      display_price: String(
        Math.max(0, Number(variant.price) - Number(variant.discount)),
      ),
      label: `${details.name} — ${variant.size} — ${variant.color.name}`,
    });
    closePicker();
  };

  return (
    <Modal
      open={open}
      onClose={closePicker}
      title={details ? `اختيار خيار — ${details.name}` : "إضافة منتج للطلب"}
      size="xl"
      mobileFullscreen
    >
      <div dir="rtl" className="min-h-[56vh]">
        {errors.length > 0 && (
          <div className="rep-error mb-4" role="alert">
            {errors.join("، ")}
          </div>
        )}
        {detailsLoading ? (
          <Skeleton className="h-96" />
        ) : details ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setDetails(null);
                setVariantId(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-black text-brand"
            >
              <ArrowRight className="h-4 w-4" /> العودة للمنتجات
            </button>
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
                {details.images[0] ? (
                  <img
                    src={
                      resolveApiAssetUrl(
                        details.images.find((image) => image.is_primary)?.url ??
                          details.images[0].url,
                      ) ?? undefined
                    }
                    alt={details.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <PackageOpen className="h-10 w-10 text-stone-300" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400">
                  {details.category.name} · {details.code}
                </p>
                <h3 className="mt-1 text-xl font-black text-brand">
                  {details.name}
                </h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {details.variants.map((item) => {
                    const exists = existing.find(
                      (entry) => entry.product_variant_id === item.id,
                    );
                    const unavailable = !allowOutOfStock &&
                      item.stock_quantity <= (exists?.quantity ?? 0);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        disabled={unavailable}
                        onClick={() => {
                          setVariantId(item.id);
                          setQuantity(1);
                        }}
                        className={`rounded-xl border p-3 text-right transition ${variantId === item.id ? "border-gold bg-gold/10 ring-2 ring-gold/15" : "border-stone-200 hover:border-brand-200"} disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <strong className="text-sm text-brand">
                            {item.size} — {item.color.name}
                          </strong>
                          <span className="flex items-baseline gap-1.5 text-xs font-black text-gold-dark">
                            {Number(item.discount) > 0 && <del className="font-normal text-stone-400">{formatMoney(item.price)}</del>}<strong>{formatMoney(
                              Math.max(
                                0,
                                Number(item.price) - Number(item.discount),
                              ),
                            )}</strong>
                          </span>
                        </span>
                        <span className="mt-2 flex items-center justify-between text-xs text-stone-500">
                          <span>{showWholesaleStock ? `المتوفر: ${item.stock_quantity}` : item.stock_quantity > 0 ? "متوفر" : "غير متوفر"}</span>
                          {Number(item.discount) > 0 && (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 font-bold text-red-700">
                              خصم {formatMoney(item.discount)}
                            </span>
                          )}
                        </span>
                        {exists && (
                          <span className="mt-1 block text-[11px] font-bold text-amber-700">
                            موجود في الطلب بكمية {exists.quantity}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {variant && (
              <div className="sticky bottom-0 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm text-brand">
                    {variant.size} — {variant.color.name}
                  </strong>
                  <p className="text-xs text-stone-500">
                    {allowOutOfStock ? "الكمية ستضاف إلى المخزون" : `متاح للإضافة: ${availableToAdd}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <QuantityInput value={quantity} max={availableToAdd} disabled={availableToAdd < 1} onChange={setQuantity} showStock={showWholesaleStock} />
                  <button
                    type="button"
                    disabled={availableToAdd < 1}
                    onClick={add}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-black text-white disabled:opacity-45"
                  >
                    <ShoppingCart className="h-4 w-4" />{" "}
                    {current ? "زيادة الكمية" : "إضافة للطلب"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <form
              onSubmit={submitSearch}
              className="grid items-end gap-3 rounded-2xl bg-stone-50 p-3 md:grid-cols-2 xl:grid-cols-[1fr_170px_170px_180px_auto]"
            >
              <RepSearchField
                label="البحث"
                value={search}
                onChange={setSearch}
                placeholder="اسم المنتج أو الكود"
              />
              <RepSelect
                label="التصنيف"
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  setPage(1);
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
                  setPage(1);
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
                  setPage(1);
                }}
                options={[
                  { value: "default", label: "الافتراضي" },
                  { value: "price_asc", label: "السعر: الأقل" },
                  { value: "price_desc", label: "السعر: الأعلى" },
                ]}
              />
              <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-black text-white">
                بحث
              </button>
            </form>
            {loading ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                  <Skeleton key={index} className="h-52" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState title="لا توجد منتجات مطابقة" />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => void openProduct(product.id)}
                    className="group overflow-hidden rounded-xl border border-stone-200 bg-white text-right transition hover:border-gold hover:shadow-md"
                  >
                    <span className="relative block aspect-[16/9] bg-stone-100">
                      {product.primary_image ? (
                        <img
                          src={
                            resolveApiAssetUrl(product.primary_image.url) ??
                            undefined
                          }
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid h-full place-items-center">
                          <PackageOpen className="h-7 w-7 text-stone-300" />
                        </span>
                      )}
                      <span
                        className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black ${product.in_stock ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
                      >
                        {product.in_stock ? "متوفر" : "غير متوفر"}
                      </span>
                      {product.has_discount && (
                        <span className="absolute left-0 top-2 rounded-r-md bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                          خصم
                        </span>
                      )}
                    </span>
                    <span className="block p-3">
                      <small className="text-[11px] font-bold text-stone-400">
                        {product.category.name} · {product.code}
                      </small>
                      <strong className="mt-1 block line-clamp-2 min-h-10 text-sm text-brand">
                        {product.name}
                      </strong>
                      <span className="mt-2 block text-sm font-black text-gold-dark">
                        يبدأ من {formatMoney(product.price)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {pagination.total_pages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="btn-outline"
                >
                  السابق
                </button>
                <span className="text-sm font-bold text-stone-600">
                  {pagination.page} من {pagination.total_pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage((value) => value + 1)}
                  className="btn-outline"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
