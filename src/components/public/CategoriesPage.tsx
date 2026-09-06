import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePublicCatalog } from '@/public/usePublicCatalog';

interface CategoriesPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function CategoriesPage({ onNavigate }: CategoriesPageProps) {
  const { categories, categoriesStatus, categoriesErrors, reloadCategories, ensureCategories } = usePublicCatalog();

  useEffect(() => ensureCategories(), [ensureCategories]);

  return (
    <main className="min-h-[60vh] bg-stone-50/70 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl"><p className="text-sm font-extrabold text-[#9C7537]">استكشف الكتالوج</p><h1 className="mt-2 text-3xl font-black text-[#162E21] sm:text-4xl">التصنيفات</h1><p className="mt-3 text-base leading-7 text-stone-500">اختر التصنيف المناسب لعرض منتجاته المتاحة.</p></div>
        {(categoriesStatus === 'idle' || categoriesStatus === 'loading') && <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-label="جاري تحميل التصنيفات">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-stone-200/70" />)}</div>}
        {categoriesStatus === 'error' && <div className="mt-9 rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-900" role="alert"><p className="font-bold">{categoriesErrors.join('، ')}</p><button onClick={reloadCategories} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black shadow-sm"><RefreshCw className="h-4 w-4" /> إعادة المحاولة</button></div>}
        {categoriesStatus === 'ready' && categories.length === 0 && <div className="mt-9 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center font-bold text-stone-500">لا توجد تصنيفات متاحة حاليًا.</div>}
        {categoriesStatus === 'ready' && categories.length > 0 && <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{categories.map((category) => <button key={category.category_id} onClick={() => onNavigate('products', { category_id: String(category.category_id) })} className="group min-h-36 rounded-2xl border border-[#162E21]/10 bg-white p-5 text-right shadow-sm transition hover:-translate-y-1 hover:border-[#9C7537]/55 hover:shadow-xl"><span className="block text-lg font-black text-[#162E21]">{category.name}</span><span className="mt-7 block text-sm font-bold text-stone-400">{category.products_count} منتج</span><span className="mt-3 block h-px w-10 bg-[#9C7537]/50 transition-all group-hover:w-20" /></button>)}</div>}
      </div>
    </main>
  );
}
