import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpLeft, Building2, PackageOpen, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  productsService,
  resolveApiAssetUrl,
  type CatalogProductSummaryDto,
} from '@/api';
import { usePublicCatalog } from '@/public/usePublicCatalog';
import { usePublicCompany } from '@/public/usePublicCompany';

type ResourceState<T> =
  | { status: 'loading'; data: T }
  | { status: 'ready'; data: T }
  | { status: 'error'; data: T; messages: string[] };

const RETAIL_PREVIEW_LIMIT = 4;
const HOME_CATEGORY_ORDER = [
  'المرايا',
  'مغاسل خشب',
  'مغاسل بورسلان',
  'أحواض فوق الشايش',
  'NiVCOR',
  'أحواض مجلى',
  'اكسسوارات',
  'السيليكون',
];
const homeCategoryOrder = new Map(HOME_CATEGORY_ORDER.map((name, index) => [normalizeCategoryName(name), index]));
const partners = [
  { name: 'Pangda', image: '/assets/partner-pangda.webp' },
  { name: 'Nivor Water Solutions', image: '/assets/partner-nivor.webp' },
  { name: 'Eco Better', image: '/assets/partner-eco-better.webp' },
];

export default function HomePage() {
  const { company } = usePublicCompany();
  const { categories, categoriesStatus, categoriesErrors, reloadCategories, ensureCategories } = usePublicCatalog();
  const [products, setProducts] = useState<ResourceState<CatalogProductSummaryDto[]>>({ status: 'loading', data: [] });
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => ensureCategories(), [ensureCategories]);

  useEffect(() => {
    const controller = new AbortController();
    setProducts({ status: 'loading', data: [] });

    productsService.listRetail({ page: 1, limit: RETAIL_PREVIEW_LIMIT, sort: 'random' }, controller.signal)
      .then((response) => setProducts({ status: 'ready', data: response.products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProducts({ status: 'error', data: [], messages: getErrorMessages(error, 'تعذر تحميل المنتجات حاليًا.') });
      });

    return () => controller.abort();
  }, [requestVersion]);

  const companyName = company?.company_name?.trim() || 'شركة الفجر';
  const orderedCategories = [...categories]
    .map((category, originalIndex) => ({ category, originalIndex }))
    .sort((a, b) => {
      const aOrder = homeCategoryOrder.get(normalizeCategoryName(a.category.name)) ?? HOME_CATEGORY_ORDER.length;
      const bOrder = homeCategoryOrder.get(normalizeCategoryName(b.category.name)) ?? HOME_CATEGORY_ORDER.length;
      return aOrder - bOrder || a.originalIndex - b.originalIndex;
    })
    .map(({ category }) => category);

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative isolate min-h-[500px] bg-[#162E21] text-white sm:min-h-[620px] lg:min-h-[680px]">
        <img src="/assets/al-fajr-store-hero.webp" alt="معرض شركة الفجر للصناعة والتجارة" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover object-[55%_center] sm:object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#10251a]/90 via-[#10251a]/65 to-[#10251a]/25 sm:from-[#10251a]/85 sm:via-[#10251a]/60 sm:to-[#10251a]/15" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#10251a]/55 via-transparent to-[#06110c]/25" />

        <div className="mx-auto flex min-h-[500px] max-w-7xl items-center px-4 py-10 sm:min-h-[620px] sm:px-6 sm:py-16 lg:min-h-[680px] lg:px-8">
          <div className="relative w-full max-w-3xl">
            <p className="mb-3 text-xs font-extrabold tracking-wide text-[#E8DCC2] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:mb-4 sm:text-sm">{companyName}</p>
            <h1 className="max-w-2xl text-[2rem] font-black leading-[1.22] tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">الفجر للصناعة والتجارة</h1>
            <h2 className="mt-4 max-w-xl text-base font-black leading-8 text-[#F3EBDD] [text-shadow:0_2px_10px_rgba(0,0,0,0.6)] sm:mt-5 sm:max-w-2xl sm:text-2xl sm:leading-9">حلول متكاملة للمنزل بتصاميم تجمع بين الجودة والأناقة</h2>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link to="/products" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C2A66D] px-5 py-2.5 text-sm font-extrabold text-[#162E21] shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#D0B982] focus:outline-none focus:ring-4 focus:ring-[#E8DCC2]/30 sm:min-h-12 sm:px-6 sm:py-3 sm:text-base">تصفح المنتجات <ArrowLeft className="h-5 w-5" /></Link>
              <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/30 bg-[#10251a]/45 px-5 py-2.5 text-sm font-extrabold text-white backdrop-blur-sm transition hover:border-white/50 hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20 sm:min-h-12 sm:px-6 sm:py-3 sm:text-base">تواصل معنا</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-extrabold text-[#C2A66D]">علامات نثق بها</p>
            <h2 className="mt-2 text-2xl font-black text-[#162E21] sm:text-3xl">شركاؤنا ووكلاؤنا</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-stone-500 sm:text-base">نتعاون مع علامات متخصصة لنقدم لكم خيارات موثوقة ومتنوعة للمنزل.</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-6">
            {partners.map((partner) => (
              <div key={partner.name} className="group flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#C2A66D]/60 hover:shadow-lg sm:h-44">
                <img src={partner.image} alt={`شعار ${partner.name}`} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-50/80 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="استكشف التشكيلة" title="تصفح حسب التصنيف" description="ابدأ من التصنيف الأقرب لما تبحث عنه." actionLabel="عرض كل التصنيفات" actionTo="/categories" showActionOnMobile />
          <div className="mt-8 sm:mt-10">
            {(categoriesStatus === 'idle' || categoriesStatus === 'loading') && <CategorySkeleton />}
            {categoriesStatus === 'error' && <ResourceError messages={categoriesErrors} onRetry={reloadCategories} />}
            {categoriesStatus === 'ready' && categories.length === 0 && <EmptyState title="لا توجد تصنيفات متاحة حاليًا" />}
            {categoriesStatus === 'ready' && categories.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-6">
                {orderedCategories.map((category) => (
                  <Link key={category.category_id} to={`/products?category_id=${category.category_id}`} aria-label={`عرض منتجات ${category.name}`} className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#162E21]/10 bg-gradient-to-br from-stone-100 to-[#E9EDE9] text-right shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#C2A66D]/55 hover:shadow-lg hover:shadow-[#162E21]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C2A66D]/25 focus-visible:ring-offset-2">
                    {category.image_url && <img src={resolveApiAssetUrl(category.image_url) ?? undefined} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />}
                    <span className="absolute inset-0 bg-gradient-to-t from-[#10251a]/45 via-[#10251a]/[0.09] to-[#10251a]/[0.07] transition-colors duration-300 group-hover:from-[#10251a]/50 group-hover:via-[#10251a]/[0.06] group-hover:to-[#10251a]/[0.03]" aria-hidden="true" />
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#10251a]/55 px-2.5 py-1.5 text-xs font-extrabold text-white backdrop-blur-[2px] transition duration-300 group-hover:border-[#C2A66D]/45 group-hover:bg-[#10251a]/70 sm:bottom-4 sm:right-4">عرض المنتجات <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5 motion-reduce:transform-none" /></span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="مختارات من الكتالوج" title="منتجات مختارة" description="معاينة سريعة لعدد من المنتجات المتاحة في الكتالوج." actionLabel="عرض جميع المنتجات" actionTo="/products" />
          <div className="mt-8">
            {products.status === 'loading' && <ProductSkeleton />}
            {products.status === 'error' && <ResourceError messages={products.messages} onRetry={() => setRequestVersion((version) => version + 1)} />}
            {products.status === 'ready' && products.data.length === 0 && <EmptyState title="لا توجد منتجات متاحة حاليًا" />}
            {products.status === 'ready' && products.data.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {products.data.map((product) => <ProductPreviewCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
          {products.status === 'ready' && products.data.length > 0 && <div className="mt-9 text-center"><Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-[#162E21]/20 px-6 py-3 text-sm font-extrabold text-[#162E21] transition hover:border-[#162E21] hover:bg-[#162E21] hover:text-white">عرض جميع المنتجات <ArrowLeft className="h-4 w-4" /></Link></div>}
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#162E21] px-6 py-12 text-white shadow-xl shadow-[#162E21]/10 sm:px-10 sm:py-14 lg:px-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#C2A66D]/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-sm font-extrabold text-[#E8DCC2]">تشكيلة متكاملة</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">كل ما تحتاجه لمساحتك في مكان واحد</h2><p className="mt-4 max-w-2xl text-base leading-8 text-stone-300">اكتشف مجموعة متنوعة من منتجات وتجهيزات المنزل بتصاميم عصرية وخيارات تلائم مختلف المساحات.</p></div>
            <Link to="/products" className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C2A66D] px-6 py-3 text-sm font-extrabold text-[#162E21] transition hover:-translate-y-0.5 hover:bg-[#D0B982] sm:w-auto">اكتشف المنتجات <ArrowUpLeft className="h-5 w-5 transition group-hover:-translate-x-1 group-hover:-translate-y-1" /></Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
          <div className="relative min-h-72 overflow-hidden rounded-[2rem] bg-[#162E21] p-8 text-white sm:min-h-80"><div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full border-[48px] border-[#C2A66D]/20" /><Building2 className="relative h-10 w-10 text-[#E8DCC2]" /><p className="relative mt-28 max-w-xs text-xl font-black leading-8 sm:mt-36">اختيارات عملية تلائم احتياجات المنازل والمشاريع.</p></div>
          <div><p className="text-sm font-extrabold text-[#C2A66D]">عن الشركة</p><h2 className="mt-3 text-3xl font-black leading-tight text-[#162E21] sm:text-4xl">تعرف إلى {companyName}</h2><p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">نقدم لكم تشكيلة متكاملة من منتجات وتجهيزات المنزل، تشمل المغاسل والأحواض، مرايا المغاسل والديكور، مغاسل البورسلان، مغاسل الخشب، أحواض المطابخ، المراحيض، السيلكون، الإنارة المنزلية والأثاث.</p><p className="mt-3 max-w-2xl text-base leading-8 text-stone-600">نسعى لتوفير منتجات تجمع بين الجودة العالية، التصاميم العصرية والتنوع، لتلبية احتياجاتكم ومنح كل مساحة لمسة مميزة وأنيقة.</p><p className="mt-3 font-extrabold text-[#162E21]">اكتشف مجموعتنا واختر ما يناسب منزلك.</p><Link to="/about" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#162E21] px-6 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#21452f]">من نحن <ArrowLeft className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section className="border-t border-[#162E21]/10 bg-[#E9EDE9] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-2xl border border-[#162E21]/15 bg-gradient-to-l from-[#F7F5EF] via-[#F3F5F1] to-[#E5ECE6] px-6 py-8 shadow-[0_12px_35px_rgba(22,46,33,0.08)] sm:px-8 md:flex-row md:items-center lg:px-10">
          <span className="absolute inset-y-0 right-0 w-1 bg-[#C2A66D]" aria-hidden="true" />
          <div className="relative"><p className="mb-2 text-xs font-extrabold text-[#C2A66D]">خطوتك التالية</p><h2 className="text-2xl font-black text-[#162E21] sm:text-3xl">اكتشف المنتجات المناسبة لاحتياجك</h2><p className="mt-2 text-base leading-7 text-stone-500">ابدأ بتصفح الكتالوج أو تواصل معنا للاستفسار.</p></div>
          <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link to="/products" className="rounded-xl bg-[#162E21] px-6 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[#21452f]">تصفح المنتجات</Link><Link to="/contact" className="rounded-xl border border-[#C2A66D]/50 bg-[#C2A66D]/[0.06] px-6 py-3 text-center text-sm font-extrabold text-[#162E21] transition hover:border-[#C2A66D] hover:bg-[#C2A66D]/15">تواصل معنا</Link></div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, actionLabel, actionTo, showActionOnMobile = false }: { eyebrow: string; title: string; description: string; actionLabel: string; actionTo: string; showActionOnMobile?: boolean }) {
  return <div className={`flex justify-between gap-6 ${showActionOnMobile ? 'flex-col items-start sm:flex-row sm:items-end' : 'items-end'}`}><div><p className="text-sm font-extrabold text-[#C2A66D]">{eyebrow}</p><h2 className="mt-2 text-2xl font-black text-[#162E21] sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-500 sm:text-base">{description}</p></div><Link to={actionTo} className={`${showActionOnMobile ? 'inline-flex' : 'hidden sm:inline-flex'} shrink-0 items-center gap-2 text-sm font-extrabold text-[#162E21] transition hover:text-[#C2A66D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A66D] focus-visible:ring-offset-4`}>{actionLabel}<ArrowLeft className="h-4 w-4" /></Link></div>;
}

function ProductPreviewCard({ product }: { product: CatalogProductSummaryDto }) {
  const imageUrl = resolveApiAssetUrl(product.primary_image?.url);

  return (
    <Link to={`/products/${product.id}`} state={{ catalogReturnTo: '/' }} className="group overflow-hidden rounded-xl border border-stone-200 bg-white text-right shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C2A66D]/45 hover:shadow-xl hover:shadow-[#162E21]/[0.07] focus:outline-none focus:ring-4 focus:ring-[#C2A66D]/15">
      <span className="relative block aspect-[5/3] overflow-hidden bg-stone-100">
        {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /> : <span className="flex h-full items-center justify-center"><PackageOpen className="h-10 w-10 text-stone-300" /></span>}
        <span className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#162E21] shadow-sm backdrop-blur-sm sm:text-xs">{product.category.name}</span>
        {product.has_discount && <span className="absolute -left-11 top-3 w-36 -rotate-45 border-y border-white/40 bg-gradient-to-r from-[#851B18] via-[#B42318] to-[#D1493F] py-1 text-center text-[10px] font-black tracking-wide text-white shadow-[0_5px_14px_rgba(87,18,15,0.38)]">خصم</span>}
      </span>
      <span className="block p-3 sm:p-4"><span className="block text-sm font-black leading-5 text-[#162E21]">{product.name}</span><span className="mt-0.5 block text-[11px] font-semibold text-stone-400">{product.code}</span><span className="mt-2.5 block text-base font-black text-[#C2A66D]">{formatPrice(product.price)}</span></span>
    </Link>
  );
}

function ResourceError({ messages, onRetry }: { messages: string[]; onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-900" role="alert"><p className="font-bold">{messages.join('، ')}</p><button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-extrabold transition hover:bg-red-100"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>;
}

function EmptyState({ title }: { title: string }) { return <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center font-bold text-stone-500">{title}</div>; }
function CategorySkeleton() { return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-6" aria-label="جاري تحميل التصنيفات">{Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-stone-200/70" />)}</div>; }
function ProductSkeleton() { return <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="جاري تحميل المنتجات">{Array.from({ length: 4 }, (_, index) => <div key={index} className="overflow-hidden rounded-xl border border-stone-200"><div className="aspect-[5/3] animate-pulse bg-stone-200" /><div className="space-y-2 p-3 sm:p-4"><div className="h-3.5 w-3/4 animate-pulse rounded bg-stone-200" /><div className="h-3.5 w-1/2 animate-pulse rounded bg-stone-100" /></div></div>)}</div>; }
function getErrorMessages(error: unknown, fallback: string) { return error instanceof ApiError ? error.messages : [fallback]; }
function formatPrice(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? `${new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 2 }).format(parsed)} ₪` : 'السعر غير متاح'; }
function normalizeCategoryName(value: string) { return value.trim().toLocaleLowerCase().replace(/[أإآ]/g, 'ا').replace(/ـ/g, '').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' '); }
