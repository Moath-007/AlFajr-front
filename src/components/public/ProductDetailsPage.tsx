import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Minus, PackageOpen, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { ApiError, productsService, resolveApiAssetUrl, type CatalogProductDetailsDto, type CatalogVariantResponseDto } from '@/api';
import { usePublicCart } from '@/public';

interface ProductDetailsPageProps {
  productId: number;
  onBack: () => void;
}

export default function ProductDetailsPage({ productId, onBack }: ProductDetailsPageProps) {
  const { addItem } = usePublicCart();
  const [product, setProduct] = useState<CatalogProductDetailsDto | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setErrors([]);
    setProduct(null);
    productsService.getRetailById(productId, controller.signal)
      .then((response) => {
        setProduct(response.product);
        const firstAvailable = response.product.variants.find((variant) => variant.stock_quantity > 0);
        setSelectedVariantId(firstAvailable?.id ?? response.product.variants[0]?.id ?? null);
        const primaryImage = response.product.images.find((image) => image.is_primary) ?? response.product.images[0];
        setSelectedImageId(primaryImage?.id ?? null);
        setQuantity(1);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setStatus('missing');
          return;
        }
        setErrors(error instanceof ApiError ? error.messages : ['تعذر تحميل تفاصيل المنتج حاليًا.']);
        setStatus('error');
      });
    return () => controller.abort();
  }, [productId, requestVersion]);

  const selectedVariant = useMemo(() => product?.variants.find((variant) => variant.id === selectedVariantId) ?? null, [product, selectedVariantId]);
  const selectedImage = useMemo(() => product?.images.find((image) => image.id === selectedImageId) ?? product?.images[0], [product, selectedImageId]);

  if (status === 'loading') return <DetailsSkeleton />;
  if (status === 'missing') return <StatePage title="المنتج غير متوفر حاليًا" description="قد يكون المنتج غير موجود أو لم يعد متاحًا في الكتالوج." onBack={onBack} />;
  if (status === 'error') return <StatePage title="تعذر تحميل المنتج" description={errors.join('، ')} onBack={onBack} onRetry={() => setRequestVersion((version) => version + 1)} />;
  if (!product) return null;

  const imageUrl = resolveApiAssetUrl(selectedImage?.url);
  const effectivePrice = selectedVariant ? Number(selectedVariant.price) - Number(selectedVariant.discount) : null;
  const originalPrice = selectedVariant ? Number(selectedVariant.price) : null;
  const hasDiscount = selectedVariant ? Number(selectedVariant.discount) > 0 : false;
  const canAdd = Boolean(selectedVariant && selectedVariant.stock_quantity > 0 && effectivePrice !== null && Number.isFinite(effectivePrice));

  const selectVariant = (variant: CatalogVariantResponseDto) => {
    setSelectedVariantId(variant.id);
    setQuantity(1);
    setAdded(false);
    setCartMessage('');
  };

  const addToCart = () => {
    if (!selectedVariant || !canAdd || effectivePrice === null) return;
    const result = addItem({
      product_variant_id: selectedVariant.id,
      quantity,
      product_id: product.id,
      product_name: product.name,
      product_code: product.code,
      size: selectedVariant.size,
      color: selectedVariant.color.name,
      stock_quantity: selectedVariant.stock_quantity,
      display_price: Number(selectedVariant.price),
      display_discount: Number(selectedVariant.discount),
      display_effective_price: effectivePrice,
      image_url: resolveApiAssetUrl(product.images.find((image) => image.is_primary)?.url ?? product.images[0]?.url),
    });
    setAdded(result.ok);
    setCartMessage(result.message);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-stone-500 transition hover:text-[#162E21]"><ArrowRight className="h-4 w-4" /> العودة إلى المنتجات</button>
      <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
        <section>
          <div className="mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">{imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><PackageOpen className="h-14 w-14 text-stone-300" /></div>}</div>
          {product.images.length > 1 && <div className="mt-4 grid grid-cols-5 gap-3">{product.images.map((image) => { const thumbnail = resolveApiAssetUrl(image.url); return <button key={image.id} onClick={() => setSelectedImageId(image.id)} aria-label={`عرض صورة ${product.name}`} className={`aspect-square overflow-hidden rounded-xl border-2 bg-stone-100 transition ${selectedImage?.id === image.id ? 'border-[#9C7537]' : 'border-transparent hover:border-stone-300'}`}>{thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : <PackageOpen className="m-auto h-full w-6 text-stone-300" />}</button>; })}</div>}
        </section>

        <section className="lg:sticky lg:top-40">
          <p className="text-sm font-extrabold text-[#9C7537]">{product.category.name}</p>
          <h1 className="mt-1.5 text-2xl font-black leading-tight text-[#162E21] sm:text-3xl">{product.name}</h1>
          <p className="mt-2 text-sm font-semibold text-stone-400">الكود: {product.code}</p>
          {product.description && <p className="mt-4 border-t border-stone-200 pt-4 text-base leading-7 text-stone-600">{product.description}</p>}

          <div className="mt-5">
            <h2 className="text-sm font-black text-[#162E21]">اختر المقاس واللون</h2>
            {product.variants.length === 0 ? <p className="mt-3 rounded-xl bg-stone-100 p-3 text-sm font-bold text-stone-500">لا توجد خيارات متاحة لهذا المنتج.</p> : <div className="mt-2.5 grid gap-2 sm:grid-cols-2">{product.variants.map((variant) => <button key={variant.id} disabled={variant.stock_quantity <= 0} onClick={() => selectVariant(variant)} aria-pressed={selectedVariantId === variant.id} className={`rounded-xl border px-3 py-2.5 text-right transition ${selectedVariantId === variant.id ? 'border-[#9C7537] bg-[#9C7537]/[0.07] ring-2 ring-[#9C7537]/10' : 'border-stone-200 bg-white hover:border-[#9C7537]/50'} disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-55`}><span className="block text-sm font-black text-[#162E21]">{variant.size} — {variant.color.name}</span><span className="mt-0.5 block text-xs font-bold text-stone-400">{variant.stock_quantity > 0 ? `متوفر: ${variant.stock_quantity}` : 'غير متوفر'}</span></button>)}</div>}
          </div>

          {selectedVariant && <div className="mt-5 rounded-2xl bg-stone-50 p-4"><p className="text-xs font-bold text-stone-500">السعر للخيار المحدد</p><div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">{hasDiscount && originalPrice !== null && <><span className="text-sm font-bold text-stone-400 line-through">{formatPrice(originalPrice)}</span><span className="rounded-md bg-[#9C7537]/10 px-1.5 py-0.5 text-xs font-black text-[#9C7537]">خصم {formatPrice(Number(selectedVariant.discount))}</span></>}<span className="text-2xl font-black text-[#9C7537]">{effectivePrice !== null ? formatPrice(effectivePrice) : '—'}</span></div></div>}

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <div className="flex h-11 items-center justify-between rounded-xl border border-stone-200 bg-white sm:w-32"><button onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1} className="h-full px-3 text-stone-500 disabled:opacity-30" aria-label="تقليل الكمية"><Minus className="h-4 w-4" /></button><span className="text-sm font-black text-[#162E21]">{quantity}</span><button onClick={() => setQuantity((current) => Math.min(selectedVariant?.stock_quantity ?? 1, current + 1))} disabled={!selectedVariant || quantity >= selectedVariant.stock_quantity} className="h-full px-3 text-stone-500 disabled:opacity-30" aria-label="زيادة الكمية"><Plus className="h-4 w-4" /></button></div>
            <button onClick={addToCart} disabled={!canAdd} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#162E21] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#21452f] disabled:cursor-not-allowed disabled:opacity-45">{added ? <><Check className="h-4 w-4" /> تمت الإضافة</> : <><ShoppingBag className="h-4 w-4" /> إضافة إلى السلة</>}</button>
          </div>
          {cartMessage && <p className={`mt-3 text-sm font-bold ${added ? 'text-green-700' : 'text-red-700'}`} role="status">{cartMessage}</p>}
        </section>
      </div>
    </main>
  );
}

function StatePage({ title, description, onBack, onRetry }: { title: string; description: string; onBack: () => void; onRetry?: () => void }) { return <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 py-16 text-center"><div><PackageOpen className="mx-auto h-12 w-12 text-stone-300" /><h1 className="mt-5 text-2xl font-black text-[#162E21]">{title}</h1><p className="mt-3 text-sm leading-7 text-stone-500">{description}</p><div className="mt-6 flex justify-center gap-3">{onRetry && <button onClick={onRetry} className="inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-4 py-2.5 text-sm font-black text-white"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button>}<button onClick={onBack} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600">العودة للمنتجات</button></div></div></main>; }
function DetailsSkeleton() { return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-label="جاري تحميل المنتج"><div className="grid gap-10 lg:grid-cols-2"><div className="aspect-square animate-pulse rounded-3xl bg-stone-200" /><div className="space-y-5 pt-6"><div className="h-4 w-24 animate-pulse rounded bg-stone-200" /><div className="h-10 w-3/4 animate-pulse rounded bg-stone-200" /><div className="h-24 animate-pulse rounded bg-stone-100" /></div></div></main>; }
function formatPrice(value: number) { return `${new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(value)} ₪`; }
