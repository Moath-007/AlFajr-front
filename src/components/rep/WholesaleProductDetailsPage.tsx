import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  PackageOpen,
  ShoppingCart,
} from "lucide-react";
import {
  productsService,
  resolveApiAssetUrl,
  type CatalogProductDetailsDto,
} from "@/api";
import { useWholesaleCart, useWholesaleStockVisibility } from "@/rep";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";
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
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    productsService
      .getWholesaleById(productId, controller.signal)
      .then((response) => {
        setProduct(response.product);
        setImageId(
          response.product.images.find((image) => image.is_primary)?.id ??
            response.product.images[0]?.id ??
            null,
        );
        const available = response.product.variants.find(
          (variant) => variant.stock_quantity > 0,
        );
        setVariantId(available?.id ?? response.product.variants[0]?.id ?? null);
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
    if (!variant || variant.stock_quantity <= 0) return;
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_code: product.code,
      product_variant_id: variant.id,
      size: variant.size,
      color: variant.color.name,
      quantity: Math.min(quantity, variant.stock_quantity),
      last_known_stock: variant.stock_quantity,
      display_price: variant.price,
      display_discount: variant.discount,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate("/rep/products")}
          className="inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-brand"
        >
          <ArrowRight className="h-4 w-4" /> العودة للمنتجات
        </button>
        <button
          onClick={() => onNavigate("/rep/orders/new")}
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
      <main className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="aspect-square overflow-hidden rounded-3xl border border-stone-200 bg-white">
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
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setImageId(item.id)}
                  className={`aspect-square overflow-hidden rounded-xl border-2 ${imageId === item.id ? "border-gold" : "border-transparent"}`}
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
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black text-gold-dark">
            {product.category.name}
          </p>
          <h1 className="mt-2 text-3xl font-black text-brand">
            {product.name}
          </h1>
          <p className="mt-1 text-sm font-bold text-stone-400">
            الكود: {product.code}
          </p>
          {product.description && (
            <p className="mt-5 leading-8 text-stone-600">
              {product.description}
            </p>
          )}
          <div className="mt-7">
            <h2 className="text-sm font-black text-brand">
              اختر المقاس واللون
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {product.variants.map((item) => (
                <button
                  key={item.id}
                  disabled={item.stock_quantity <= 0}
                  onClick={() => {
                    setVariantId(item.id);
                    setQuantity(1);
                  }}
                  className={`rounded-xl border p-3 text-right transition ${variantId === item.id ? "border-gold bg-gold/10 ring-2 ring-gold/15" : "border-stone-200 hover:border-gold/60"} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <strong className="block text-brand">
                    {item.size} — {item.color.name}
                  </strong>
                  <span className="mt-1 block text-xs text-stone-500">{item.stock_quantity > 0 ? showWholesaleStock ? `المتوفر: ${item.stock_quantity}` : "متوفر" : "غير متوفر"}</span>
                </button>
              ))}
            </div>
          </div>
          {variant && (
            <div className="mt-6 rounded-2xl bg-stone-50 p-4">
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
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-bold text-stone-600">الكمية</span>
                <QuantityInput value={quantity} max={variant.stock_quantity} onChange={setQuantity} showStock={showWholesaleStock} />
              </div>
            </div>
          )}
          <button
            disabled={!variant || variant.stock_quantity <= 0}
            onClick={add}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-5 w-5" />
            {added ? "تمت الإضافة" : "إضافة إلى طلب الجملة"}
          </button>
        </section>
      </main>
    </div>
  );
}
