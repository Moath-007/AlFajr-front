import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, PackageOpen, PackageSearch, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ApiError,
  productsService,
  resolveApiAssetUrl,
  type CatalogPaginationDto,
  type CatalogProductSummaryDto,
  type CatalogSort,
} from '@/api';
import { usePublicCatalog } from '@/public/usePublicCatalog';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import PublicSelect from './PublicSelect';

const DEFAULT_LIMIT = 12;
const emptyPagination: CatalogPaginationDto = { page: 1, limit: DEFAULT_LIMIT, total: 0, total_pages: 0 };

export default function ProductsPage() {
  const { categories, colors, categoriesStatus, colorsStatus, categoriesErrors, colorsErrors, reloadCategories, reloadColors, ensureCategories, ensureColors } = usePublicCatalog();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('search') ?? '';
  const categoryId = parsePositiveInteger(searchParams.get('category_id'));
  const colorId = parsePositiveInteger(searchParams.get('color_id'));
  const page = parsePositiveInteger(searchParams.get('page')) ?? 1;
  const sort = parseSort(searchParams.get('sort'));
  const [searchInput, setSearchInput] = useState(searchParam);
  const [products, setProducts] = useState<CatalogProductSummaryDto[]>([]);
  const [pagination, setPagination] = useState<CatalogPaginationDto>(emptyPagination);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errors, setErrors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    ensureCategories();
    ensureColors();
  }, [ensureCategories, ensureColors]);

  const updateParams = useCallback((updates: Record<string, string | number | null>, replace = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'default' || (key === 'page' && value === 1)) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace });
  }, [setSearchParams]);

  useEffect(() => setSearchInput(searchParam), [searchParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized !== searchParam) updateParams({ search: normalized || null, page: null });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, searchParam, updateParams]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setErrors([]);
    productsService.listRetail({ page, limit: DEFAULT_LIMIT, search: searchParam || undefined, category_id: categoryId, color_id: colorId, sort }, controller.signal)
      .then((response) => {
        setProducts(response.products);
        setPagination(response.pagination);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setProducts([]);
        setPagination(emptyPagination);
        setErrors(error instanceof ApiError ? error.messages : ['تعذر تحميل المنتجات حاليًا.']);
        setStatus('error');
      });
    return () => controller.abort();
  }, [page, searchParam, categoryId, colorId, sort, requestVersion]);

  const pageNumbers = useMemo(() => getPageNumbers(pagination.page, pagination.total_pages), [pagination.page, pagination.total_pages]);
  const activeFilters = Number(categoryId !== undefined) + Number(colorId !== undefined);
  const clearFilters = () => updateParams({ category_id: null, color_id: null, sort: null, page: null });

  const filters = (
    <div className="space-y-6">
      <PublicSelect label="التصنيف" allLabel="الكل" value={categoryId ? String(categoryId) : ''} disabled={categoriesStatus !== 'ready'} onChange={(value) => updateParams({ category_id: value || null, page: null })} options={categories.map((category) => ({ value: String(category.category_id), label: `${category.name} (${category.products_count})` }))} />
      {categoriesStatus === 'error' && <FilterError messages={categoriesErrors} onRetry={reloadCategories} />}
      <PublicSelect label="اللون" allLabel="الكل" value={colorId ? String(colorId) : ''} disabled={colorsStatus !== 'ready'} onChange={(value) => updateParams({ color_id: value || null, page: null })} options={colors.map((color) => ({ value: String(color.color_id), label: color.name }))} />
      {colorsStatus === 'error' && <FilterError messages={colorsErrors} onRetry={reloadColors} />}
    </div>
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6"><p className="text-xs font-extrabold text-[#C2A66D]">الكتالوج</p><h1 className="mt-1.5 text-2xl font-black text-[#162E21] sm:text-3xl">المنتجات</h1><p className="mt-1.5 text-sm text-stone-500">ابحث وصفِّ النتائج للوصول إلى المنتج المناسب.</p></div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="ابحث باسم المنتج أو الكود…" className="w-full rounded-xl border border-stone-200 bg-white py-3 pe-12 ps-11 text-sm font-semibold outline-none transition focus:border-[#C2A66D] focus:ring-4 focus:ring-[#C2A66D]/10" />{searchInput && <button onClick={() => setSearchInput('')} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>}</div>
        <PublicSelect ariaLabel="ترتيب المنتجات" value={sort} onChange={(value) => updateParams({ sort: value, page: null })} className="sm:w-56" options={[{ value: 'default', label: 'الترتيب الافتراضي' }, { value: 'price_asc', label: 'السعر: الأقل أولًا' }, { value: 'price_desc', label: 'السعر: الأعلى أولًا' }]} />
        <button onClick={() => setShowFilters(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-[#162E21] lg:hidden"><SlidersHorizontal className="h-4 w-4" /> الفلاتر {activeFilters > 0 && <span className="rounded-full bg-[#C2A66D] px-2 py-0.5 text-xs text-[#162E21]">{activeFilters}</span>}</button>
      </div>

      <div className="grid gap-7 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-40 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><h2 className="font-black text-[#162E21]">تصفية النتائج</h2>{activeFilters > 0 && <button onClick={clearFilters} className="text-xs font-bold text-[#C2A66D]">مسح الكل</button>}</div>{filters}</div></aside>
        <section>
          <div className="mb-4 min-h-6 text-sm font-semibold text-stone-500">{status === 'ready' && pagination.total > 0 ? `${pagination.total} منتج` : status === 'ready' ? 'لا توجد نتائج' : ''}</div>
          {status === 'loading' && <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 12 }, (_, index) => <ProductCardSkeleton key={index} />)}</div>}
          {status === 'error' && <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-900" role="alert"><p className="font-bold">{errors.join('، ')}</p><button onClick={() => setRequestVersion((version) => version + 1)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>}
          {status === 'ready' && products.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center"><PackageSearch className="mx-auto h-10 w-10 text-stone-300" /><h2 className="mt-4 font-black text-[#162E21]">لا توجد منتجات مطابقة</h2><p className="mt-2 text-sm text-stone-500">جرّب تغيير البحث أو الفلاتر.</p>{(activeFilters > 0 || searchParam) && <button onClick={() => { setSearchInput(''); updateParams({ search: null, category_id: null, color_id: null, sort: null, page: null }); }} className="mt-5 rounded-xl border border-[#162E21]/20 px-4 py-2 text-sm font-bold text-[#162E21]">مسح البحث والفلاتر</button>}</div>}
          {status === 'ready' && products.length > 0 && <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{products.map((product) => <CatalogCard key={product.id} product={product} returnTo={`${location.pathname}${location.search}`} />)}</div>}
          {status === 'ready' && pagination.total_pages > 1 && <nav className="mt-9 flex flex-wrap items-center justify-center gap-2" aria-label="صفحات المنتجات"><PageLink disabled={pagination.page <= 1} to={pageHref(searchParams, pagination.page - 1)}><ChevronRight className="h-4 w-4" /> السابق</PageLink>{pageNumbers.map((item, index) => item === 'ellipsis' ? <span key={`ellipsis-${index}`} className="px-1 text-stone-400">…</span> : item === pagination.page ? <span key={item} aria-current="page" className="h-10 min-w-10 rounded-xl bg-[#162E21] text-center text-sm font-black leading-10 text-white">{item}</span> : <Link key={item} to={pageHref(searchParams, item)} className="h-10 min-w-10 rounded-xl border border-stone-200 bg-white text-center text-sm font-black leading-10 text-stone-600 transition hover:border-[#C2A66D]">{item}</Link>)}<PageLink disabled={pagination.page >= pagination.total_pages} to={pageHref(searchParams, pagination.page + 1)}>التالي <ChevronLeft className="h-4 w-4" /></PageLink></nav>}
        </section>
      </div>

      {showFilters && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="إغلاق الفلاتر" className="absolute inset-0 bg-black/45" onClick={() => setShowFilters(false)} /><aside className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto bg-white p-6 shadow-2xl"><div className="mb-7 flex items-center justify-between"><h2 className="text-lg font-black text-[#162E21]">تصفية النتائج</h2><button onClick={() => setShowFilters(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button></div>{filters}{activeFilters > 0 && <button onClick={clearFilters} className="mt-8 w-full rounded-xl border border-stone-200 py-3 text-sm font-bold text-[#C2A66D]">مسح الفلاتر</button>}<button onClick={() => setShowFilters(false)} className="mt-3 w-full rounded-xl bg-[#162E21] py-3 text-sm font-black text-white">عرض النتائج</button></aside></div>}
    </main>
  );
}

function CatalogCard({ product, returnTo }: { product: CatalogProductSummaryDto; returnTo: string }) {
  const image = resolveApiAssetUrl(product.primary_image?.url);
  return <Link to={`/products/${product.id}`} state={{ catalogReturnTo: returnTo }} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-right shadow-sm transition hover:-translate-y-1 hover:border-[#C2A66D]/50 hover:shadow-xl"><span className="relative block aspect-[4/3] overflow-hidden bg-stone-100">{image ? <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <span className="flex h-full items-center justify-center"><PackageOpen className="h-9 w-9 text-stone-300" /></span>}<span className={`absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-black shadow-md backdrop-blur-sm ${product.in_stock ? 'border-[#C2A66D]/45 bg-[#FFFCF5]/95 text-[#162E21]' : 'border-stone-300 bg-white/95 text-stone-700'}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${product.in_stock ? 'bg-[#C2A66D]' : 'bg-stone-400'}`} />{product.in_stock ? 'متوفر' : 'غير متوفر'}</span>{product.has_discount && <span className="absolute -left-10 top-4 w-36 -rotate-45 border-y border-white/40 bg-gradient-to-r from-[#851B18] via-[#B42318] to-[#D1493F] py-1.5 text-center text-xs font-black tracking-wide text-white shadow-[0_5px_14px_rgba(87,18,15,0.38)]">خصم</span>}</span><span className="block p-3.5"><span className="text-xs font-bold text-stone-400">{product.category.name}</span><span className="mt-1 block text-sm font-black leading-6 text-[#162E21] sm:text-base">{product.name}</span><span className="mt-0.5 block text-xs text-stone-400">{product.code}</span><span className="mt-3 block text-base font-black text-[#C2A66D] sm:text-lg">{formatPrice(product.price)}</span></span></Link>;
}

function FilterError({ messages, onRetry }: { messages: string[]; onRetry: () => void }) { return <div className="-mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700"><p>{messages.join('، ')}</p><button onClick={onRetry} className="mt-2 underline">إعادة المحاولة</button></div>; }
function PageLink({ children, disabled, to }: { children: React.ReactNode; disabled: boolean; to: string }) { const className = "inline-flex h-10 items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-stone-600 transition hover:border-[#C2A66D]"; return disabled ? <span aria-disabled="true" className={`${className} cursor-not-allowed opacity-40`}>{children}</span> : <Link to={to} className={className}>{children}</Link>; }
function pageHref(current: URLSearchParams, page: number): string { const next = new URLSearchParams(current); if (page <= 1) next.delete('page'); else next.set('page', String(page)); const query = next.toString(); return query ? `/products?${query}` : '/products'; }
function parsePositiveInteger(value: string | null): number | undefined { if (!value) return undefined; const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined; }
function parseSort(value: string | null): CatalogSort { return value === 'price_asc' || value === 'price_desc' ? value : 'default'; }
function formatPrice(value: string): string { const parsed = Number(value); return Number.isFinite(parsed) ? `${new Intl.NumberFormat('ar-EG-u-nu-latn', { maximumFractionDigits: 2 }).format(parsed)} ₪` : 'السعر غير متاح'; }
function getPageNumbers(current: number, total: number): Array<number | 'ellipsis'> { if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1); const values = [...new Set([1, 2, current - 1, current, current + 1, total - 1, total])].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b); const result: Array<number | 'ellipsis'> = []; values.forEach((value, index) => { if (index > 0 && value - values[index - 1] > 1) result.push('ellipsis'); result.push(value); }); return result; }
