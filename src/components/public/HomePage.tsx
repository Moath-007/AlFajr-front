import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpLeft, Building2, PackageOpen, RefreshCw } from 'lucide-react';
import {
  ApiError,
  productsService,
  resolveApiAssetUrl,
  type CatalogProductSummaryDto,
} from '@/api';
import { heroImage } from '@/data/mockData';
import { usePublicCatalog } from '@/public/usePublicCatalog';
import { usePublicCompany } from '@/public/usePublicCompany';

interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

type ResourceState<T> =
  | { status: 'loading'; data: T }
  | { status: 'ready'; data: T }
  | { status: 'error'; data: T; messages: string[] };

const RETAIL_PREVIEW_LIMIT = 6;

export default function HomePage({ onNavigate }: HomePageProps) {
  const { company } = usePublicCompany();
  const { categories, categoriesStatus, categoriesErrors, reloadCategories, ensureCategories } = usePublicCatalog();
  const [products, setProducts] = useState<ResourceState<CatalogProductSummaryDto[]>>({ status: 'loading', data: [] });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => ensureCategories(), [ensureCategories]);

  useEffect(() => {
    const controller = new AbortController();
    setProducts({ status: 'loading', data: [] });

    productsService.listRetail({ page: 1, limit: RETAIL_PREVIEW_LIMIT }, controller.signal)
      .then((response) => setProducts({ status: 'ready', data: response.products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProducts({ status: 'error', data: [], messages: getErrorMessages(error, 'تعذر تحميل المنتجات حاليًا.') });
      });

    return () => controller.abort();
  }, [requestVersion]);

  const companyName = company?.company_name?.trim() || 'شركة الفجر';

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative isolate min-h-[590px] bg-[#162E21] text-white sm:min-h-[640px] lg:min-h-[680px]">
        <img src={heroImage} alt="تجهيزات حمامات عصرية" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#162E21] via-[#162E21]/90 to-[#162E21]/35" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#162E21]/45 to-transparent" />

        <div className="mx-auto flex min-h-[590px] max-w-7xl items-center px-4 py-16 sm:min-h-[640px] sm:px-6 lg:min-h-[680px] lg:px-8">
          <div className="relative max-w-2xl">
            <p className="mb-5 text-sm font-extrabold tracking-wide text-[#E5C68F]">{companyName}</p>
            <h1 className="max-w-xl text-4xl font-black leading-[1.22] tracking-tight sm:text-5xl lg:text-6xl">تجهيزات حمامات تجمع العملية وأناقة التفاصيل</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-stone-200 sm:text-lg">استكشف تشكيلة منتجات الحمامات والتجهيزات المتاحة، واختر ما يناسب احتياجك بسهولة.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => onNavigate('products')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#9C7537] px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#ad8444] focus:outline-none focus:ring-4 focus:ring-[#D8B16D]/30">تصفح المنتجات <ArrowLeft className="h-5 w-5" /></button>
              <button onClick={() => onNavigate('contact')} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-base font-extrabold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20">تواصل معنا</button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50/80 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="استكشف التشكيلة" title="تصفح حسب التصنيف" description="ابدأ من التصنيف الأقرب لما تبحث عنه." actionLabel="عرض كل التصنيفات" onAction={() => onNavigate('categories')} />
          <div className="mt-8">
            {(categoriesStatus === 'idle' || categoriesStatus === 'loading') && <CategorySkeleton />}
            {categoriesStatus === 'error' && <ResourceError messages={categoriesErrors} onRetry={reloadCategories} />}
            {categoriesStatus === 'ready' && categories.length === 0 && <EmptyState title="لا توجد تصنيفات متاحة حاليًا" />}
            {categoriesStatus === 'ready' && categories.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {categories.map((category) => (
                  <button key={category.category_id} onClick={() => onNavigate('products', { category_id: String(category.category_id) })} className="group relative min-h-28 overflow-hidden rounded-2xl border border-[#162E21]/10 bg-gradient-to-br from-white via-white to-[#162E21]/[0.035] p-4 text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#9C7537]/60 hover:shadow-lg hover:shadow-[#162E21]/10 focus:outline-none focus:ring-4 focus:ring-[#9C7537]/15 sm:p-5">
                    <span className="absolute -bottom-9 -left-8 h-24 w-24 rounded-full border-[14px] border-[#9C7537]/10 transition duration-300 group-hover:scale-110 group-hover:border-[#9C7537]/20" aria-hidden="true" />
                    <span className="absolute right-0 top-4 h-9 w-1 rounded-l-full bg-[#9C7537] transition-all duration-300 group-hover:h-14" aria-hidden="true" />
                    <span className="relative block text-base font-black leading-7 text-[#162E21] sm:text-lg">{category.name}</span>
                    <span className="relative mt-5 inline-flex items-center gap-1 border-b border-[#9C7537]/40 pb-0.5 text-xs font-extrabold text-[#9C7537] transition group-hover:border-[#9C7537] group-hover:text-[#162E21]">عرض المنتجات <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="مختارات من الكتالوج" title="منتجات مختارة" description="معاينة سريعة لعدد من المنتجات المتاحة في الكتالوج." actionLabel="عرض جميع المنتجات" onAction={() => onNavigate('products')} />
          <div className="mt-8">
            {products.status === 'loading' && <ProductSkeleton />}
            {products.status === 'error' && <ResourceError messages={products.messages} onRetry={() => setRequestVersion((version) => version + 1)} />}
            {products.status === 'ready' && products.data.length === 0 && <EmptyState title="لا توجد منتجات متاحة حاليًا" />}
            {products.status === 'ready' && products.data.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
                {products.data.map((product) => <ProductPreviewCard key={product.id} product={product} onOpen={() => onNavigate('product-details', { id: String(product.id) })} />)}
              </div>
            )}
          </div>
          {products.status === 'ready' && products.data.length > 0 && <div className="mt-9 text-center"><button onClick={() => onNavigate('products')} className="inline-flex items-center gap-2 rounded-xl border border-[#162E21]/20 px-6 py-3 text-sm font-extrabold text-[#162E21] transition hover:border-[#162E21] hover:bg-[#162E21] hover:text-white">عرض جميع المنتجات <ArrowLeft className="h-4 w-4" /></button></div>}
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#162E21] px-6 py-12 text-white shadow-xl shadow-[#162E21]/10 sm:px-10 sm:py-14 lg:px-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#9C7537]/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-sm font-extrabold text-[#D8B16D]">تشكيلة متكاملة</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">كل ما تحتاجه لمساحتك في مكان واحد</h2><p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">اكتشف مجموعة متنوعة من منتجات وتجهيزات الحمامات بتصاميم وخيارات مختلفة.</p></div>
            <button onClick={() => onNavigate('products')} className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#9C7537] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#ad8444] sm:w-auto">اكتشف المنتجات <ArrowUpLeft className="h-5 w-5 transition group-hover:-translate-x-1 group-hover:-translate-y-1" /></button>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
          <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-[#162E21] p-8 text-white sm:min-h-80"><div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[48px] border-[#9C7537]/20" /><Building2 className="relative h-10 w-10 text-[#D8B16D]" /><p className="relative mt-28 max-w-xs text-xl font-black leading-8 sm:mt-36">اختيارات عملية تلائم احتياجات المنازل والمشاريع.</p></div>
          <div><p className="text-sm font-extrabold text-[#9C7537]">عن الشركة</p><h2 className="mt-3 text-3xl font-black leading-tight text-[#162E21] sm:text-4xl">تعرف إلى {companyName}</h2><p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">شركة متخصصة في منتجات وتجهيزات الحمامات، وتقدم تشكيلة عملية ومتنوعة تناسب احتياجات المساحات المختلفة.</p><button onClick={() => onNavigate('about')} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#21452f]">من نحن <ArrowLeft className="h-4 w-4" /></button></div>
        </div>
      </section>

      <section className="bg-[#9C7537] text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div><h2 className="text-2xl font-black sm:text-3xl">اكتشف المنتجات المناسبة لاحتياجك</h2><p className="mt-2 text-base leading-7 text-white/80">ابدأ بتصفح الكتالوج أو تواصل معنا للاستفسار.</p></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><button onClick={() => onNavigate('products')} className="rounded-xl bg-[#162E21] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#21452f]">تصفح المنتجات</button><button onClick={() => onNavigate('contact')} className="rounded-xl border border-white/40 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-white/10">تواصل معنا</button></div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="flex items-end justify-between gap-6"><div><p className="text-sm font-extrabold text-[#9C7537]">{eyebrow}</p><h2 className="mt-2 text-2xl font-black text-[#162E21] sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-500 sm:text-base">{description}</p></div><button onClick={onAction} className="hidden shrink-0 items-center gap-2 text-sm font-extrabold text-[#162E21] transition hover:text-[#9C7537] sm:inline-flex">{actionLabel}<ArrowLeft className="h-4 w-4" /></button></div>;
}

function ProductPreviewCard({ product, onOpen }: { product: CatalogProductSummaryDto; onOpen: () => void }) {
  const imageUrl = resolveApiAssetUrl(product.primary_image?.url);

  return (
    <button onClick={onOpen} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#9C7537]/45 hover:shadow-xl hover:shadow-[#162E21]/[0.07] focus:outline-none focus:ring-4 focus:ring-[#9C7537]/15">
      <span className="relative block aspect-[4/3] overflow-hidden bg-stone-100">
        {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /> : <span className="flex h-full items-center justify-center"><PackageOpen className="h-10 w-10 text-stone-300" /></span>}
        <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-bold text-[#162E21] shadow-sm backdrop-blur-sm">{product.category.name}</span>
        {product.has_discount && <span className="absolute -left-10 top-4 w-36 -rotate-45 border-y border-white/40 bg-gradient-to-r from-[#851B18] via-[#B42318] to-[#D1493F] py-1.5 text-center text-xs font-black tracking-wide text-white shadow-[0_5px_14px_rgba(87,18,15,0.38)]">خصم</span>}
      </span>
      <span className="block p-4 sm:p-5"><span className="block text-sm font-black leading-6 text-[#162E21] sm:text-base">{product.name}</span><span className="mt-1 block text-xs font-semibold text-stone-400">{product.code}</span><span className="mt-4 block text-lg font-black text-[#9C7537]">{formatPrice(product.price)}</span></span>
    </button>
  );
}

function ResourceError({ messages, onRetry }: { messages: string[]; onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-900" role="alert"><p className="font-bold">{messages.join('، ')}</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-red-100"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>;
}

function EmptyState({ title }: { title: string }) { return <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center font-bold text-stone-500">{title}</div>; }
function CategorySkeleton() { return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" aria-label="جاري تحميل التصنيفات">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-stone-200/70" />)}</div>; }
function ProductSkeleton() { return <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3" aria-label="جاري تحميل المنتجات">{Array.from({ length: 6 }, (_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-stone-200"><div className="aspect-[4/3] animate-pulse bg-stone-200" /><div className="space-y-3 p-5"><div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" /><div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" /></div></div>)}</div>; }
function getErrorMessages(error: unknown, fallback: string) { return error instanceof ApiError ? error.messages : [fallback]; }
function formatPrice(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? `${new Intl.NumberFormat('ar', { maximumFractionDigits: 2 }).format(parsed)} ₪` : 'السعر غير متاح'; }
