import { useState, useMemo } from 'react';
import { Search, Boxes, Warehouse, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Product, Category } from '@/types';
import { getTotalStock } from '@/utils/helpers';
import EmptyState from '@/components/ui/EmptyState';

interface OwnerInventoryProps {
  products: Product[];
  categories: Category[];
}

export default function OwnerInventory({ products, categories }: OwnerInventoryProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.includes(search) && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  return (
      <div className="space-y-8 animate-fade-in pb-28"> {/* مساحة إضافية بالأسفل حتى لا يغطي الشريط العائم المحتوى */}

        {/* رأس الصفحة الفخم */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
              <Warehouse className="h-3.5 w-3.5" />
              <span>نظام المستودعات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">إدارة ومراقبة المخزون</h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">تتبع مخزون المنتجات والمتغيرات بدقة ({filtered.length} منتج مطابق)</p>
          </div>
        </div>

        {/* شريط البحث والتصفية */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ابحث عن منتج بالاسم أو الكود..."
                className="input w-full pr-12 pl-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-medium bg-stone-50/50 focus:bg-white transition-all"
            />
          </div>

          <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="input sm:w-56 px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-bold bg-stone-50/50 focus:bg-white transition-all text-stone-700"
          >
            <option value="">كل التصنيفات</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* جدول أو بطاقات المخزون */}
        {filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200/80 shadow-xs">
              <EmptyState
                  icon={<Boxes className="h-10 w-10 text-amber-600" />}
                  title="لا توجد منتجات مطابقة"
                  description="جرب تغيير كلمات البحث أو اختيار تصنيف مختلف."
              />
            </div>
        ) : (
            <div className="space-y-4">
              {paginatedProducts.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const total = getTotalStock(p);
                return (
                    <div key={p.id} className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden transition-all hover:shadow-md">

                      {/* رأس البطاقة للمنتج */}
                      <div className="flex items-center gap-4 p-5 border-b border-stone-100 bg-stone-50/60">
                        <img src={p.image} alt={p.name} className="h-14 w-14 rounded-2xl object-cover shadow-xs shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-brand text-base truncate">{p.name}</div>
                          <div className="text-xs text-stone-400 font-medium mt-0.5">
                            {cat?.name || 'بدون تصنيف'} • الكود: <strong className="text-stone-700">{p.code}</strong>
                          </div>
                        </div>
                        <div className="text-left shrink-0 bg-white px-4 py-2 rounded-2xl border border-stone-200/60 shadow-xs">
                          <div className={`text-lg font-black ${total === 0 ? 'text-rose-600' : total <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {total}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400">إجمالي المخزون</div>
                        </div>
                      </div>

                      {/* تفاصيل المتغيرات (Variants Table) */}
                      <div className="overflow-x-auto p-2">
                        <table className="w-full text-sm">
                          <thead className="text-stone-400 text-xs border-b border-stone-100">
                          <tr>
                            <th className="px-5 py-3 text-right font-bold">المقاس</th>
                            <th className="px-5 py-3 text-right font-bold">اللون</th>
                            <th className="px-5 py-3 text-right font-bold">المخزون الحالي</th>
                            <th className="px-5 py-3 text-right font-bold">الحالة</th>
                          </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                          {p.variants.map((v, i) => (
                              <tr key={i} className="hover:bg-stone-50/80 transition-colors">
                                <td className="px-5 py-3.5 text-stone-700 font-semibold">{v.size}</td>
                                <td className="px-5 py-3.5 text-stone-700 font-semibold">{v.color}</td>
                                <td className="px-5 py-3.5 font-black text-stone-900">{v.stock}</td>
                                <td className="px-5 py-3.5">
                                  {v.stock === 0 ? <span className="badge-red">نفد</span> :
                                      v.stock <= 5 ? <span className="badge-gold">منخفض</span> :
                                          <span className="badge-green">متوفر</span>}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>

                    </div>
                );
              })}

              {/* نظام ترقيم الصفحات العائم (Floating Pagination) */}
              {totalPages > 1 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md">
                    <div className="flex items-center justify-between bg-stone-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-2xl text-white">
                      <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span>السابق</span>
                      </button>

                      <div className="text-xs font-extrabold tracking-wide">
                        صفحة <span className="text-amber-400">{currentPage}</span> من <span className="text-stone-300">{totalPages}</span>
                      </div>

                      <button
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>التالي</span>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
              )}
            </div>
        )}
      </div>
  );
}