import { useEffect, useMemo, useState } from "react";
import { ArrowRight, PackageOpen, ShoppingCart } from "lucide-react";
import {
  productsService,
  resolveApiAssetUrl,
  type CatalogProductDetailsDto,
} from "@/api";
import { useWholesaleCart, useWholesaleStockVisibility } from "@/rep";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";
import Modal from "@/components/ui/Modal";
import QuantityInput from "@/components/ui/QuantityInput";

export default function WholesaleProductDetailsPage({
  productId,
  onNavigate,
}: {
  productId: number;
  onNavigate: (path: string) => void;
}) {
  const { addItem, totalQuantity } = useWholesaleCart();
  const { showWholesaleStock } = useWholesaleStockVisibility();
  const [product, setProduct] = useState<CatalogProductDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [imageId, setImageId] = useState<number | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrors([]);
    setQuantity(1);
    setPreviewOpen(false);
    productsService
      .getWholesaleById(productId, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setProduct(response.product);
        setImageId(
          response.product.images.find((image) => image.is_primary)?.id ??
            response.product.images[0]?.id ??
            null,
        );
        setVariantId(response.product.variants[0]?.id ?? null);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setErrors(apiMessages(error, "تعذر تحميل المنتج."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId]);
  const variant = useMemo(
    () => product?.variants.find((item) => item.id === variantId) ?? null,
    [product, variantId],
  );
  const image =
    product?.images.find((item) => item.id === imageId) ?? product?.images[0];
  if (loading)
    return (
      <div className="grid gap-7 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  if (errors.length || !product)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center font-bold text-red-800">
        {errors.join("، ") || "المنتج غير موجود."}
      </div>
    );
  const effectivePrice = variant
    ? Math.max(0, Number(variant.price) - Number(variant.discount))
    : 0;
  const add = () => {
    if (!variant) return;
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_code: product.code,
      product_variant_id: variant.id,
      size: variant.size,
      color: variant.color.name,
      quantity,
      last_known_stock: variant.stock_quantity,
      display_price: variant.price,
      display_discount: variant.discount,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate("/rep/products")}
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-brand"
        >
          <ArrowRight className="h-4 w-4" /> العودة للمنتجات
        </button>
        <button
          onClick={() => onNavigate("/rep/orders/new")}
          aria-label="مراجعة طلب الجملة"
          className="relative rounded-xl border border-stone-200 bg-white p-3 text-brand"
        >
          <ShoppingCart className="h-5 w-5" />
          {totalQuantity > 0 && (
            <span className="absolute -left-2 -top-2 rounded-full bg-gold px-2 text-xs font-black">
              {totalQuantity}
            </span>
          )}
        </button>
      </div>
      <main className="grid items-start gap-5 sm:gap-7 lg:grid-cols-2">
        <section>
          <button
            type="button"
            disabled={!image}
            onClick={() => setPreviewOpen(true)}
            aria-label="عرض الصورة كاملة"
            className="mx-auto block aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-stone-200 bg-white focus-visible:ring-2 focus-visible:ring-gold"
          >
            {image ? (
              <img
                src={resolveApiAssetUrl(image.url) ?? undefined}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center">
                <PackageOpen className="h-16 w-16 text-stone-300" />
              </div>
            )}
          </button>
          {image && <button type="button" className="mx-auto mt-2 block text-sm font-bold text-brand underline" onClick={() => setPreviewOpen(true)}>عرض الصورة كاملة</button>}
          {product.images.length > 1 && (
            <div className="mx-auto mt-2 flex max-w-[520px] gap-2 overflow-x-auto pb-1">
              {product.images.map((item) => (
                <button
                  key={item.id}
                  aria-label={`عرض صورة ${product.images.indexOf(item) + 1}`}
                  aria-pressed={imageId === item.id}
                  onClick={() => setImageId(item.id)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${imageId === item.id ? "border-gold" : "border-transparent"}`}
                >
                  <img
                    src={resolveApiAssetUrl(item.url) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="min-w-0 lg:sticky lg:top-32">
          <p className="text-sm font-black text-gold-dark">
            {product.category.name}
          </p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-brand sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-1 text-sm font-bold text-stone-400">
            الكود: {product.code}
          </p>
          {product.description && (
            <p className="mt-4 border-t border-stone-200 pt-4 text-sm leading-7 text-stone-600 sm:text-base">
              {product.description}
            </p>
          )}
          <div className="mt-5">
            <h2 className="text-sm font-black text-brand">
              اختر المقاس واللون
            </h2>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {product.variants.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={variantId === item.id}
                  onClick={() => {
                    setVariantId(item.id);
                    setQuantity(1);
                  }}
                  className={`min-w-0 rounded-xl border px-3 py-2.5 text-sm text-right transition ${variantId === item.id ? "border-gold bg-gold/10 ring-2 ring-gold/15" : "border-stone-200 hover:border-gold/60"} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <strong className="block text-brand">
                    {item.size} — {item.color.name}
                  </strong>
                  <span className="mt-1 block text-xs text-stone-500">
                    {showWholesaleStock
                      ? `الرصيد الحالي: ${item.stock_quantity}`
                      : "متاح للطلب"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {variant && (
            <div className="mt-5 rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <p className="mb-2 text-xs text-stone-500">
                سعر الجملة للخيار المحدد
              </p>
              <div className="flex flex-wrap items-baseline gap-3">
                {Number(variant.discount) > 0 && (
                  <span className="text-sm text-stone-400 line-through">
                    {formatMoney(variant.price)}
                  </span>
                )}
                <strong className="text-2xl font-black text-gold-dark">
                  {formatMoney(effectivePrice)}
                </strong>
                {Number(variant.discount) > 0 && (
                  <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                    خصم {formatMoney(variant.discount)}
                  </span>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-600">الكمية</span>
                <QuantityInput value={quantity} onChange={setQuantity} />
              </div>
            </div>
          )}
          <button
            disabled={!variant}
            onClick={add}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-5 w-5" />
            {added ? "تمت الإضافة" : "إضافة إلى طلب الجملة"}
          </button>
        </section>
      </main>
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={product.name}
        size="xl"
      >
        {image && (
          <img
            src={resolveApiAssetUrl(image.url) ?? undefined}
            alt={product.name}
            className="mx-auto max-h-[75dvh] w-full object-contain"
          />
        )}
      </Modal>
    </div>
  );
}
