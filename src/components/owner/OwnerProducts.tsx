import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Search, Package, Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import type { Product, Category } from '@/types';
import { formatPrice, getStockLevel, getTotalStock } from '@/utils/helpers';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import ProductForm from './ProductForm';

interface OwnerProductsProps {
  products: Product[];
  categories: Category[];
  onAdd: (p: Omit<Product, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onDelete: (id: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function OwnerProducts({ products, categories, onAdd, onUpdate, onDelete, onNotify }: OwnerProductsProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // عدد المنتجات في كل صفحة

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.includes(search) && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && p.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  // حساب المنتجات الخاصة بالصفحة الحالية
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // إعادة الصفحة إلى 1 عند البحث أو تغيير الفلتر
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleSave = (data: Omit<Product, 'id'>) => {
    if (editing) {
      onUpdate(editing.id, data);
      onNotify('تم تحديث المنتج بنجاح');
    } else {
      onAdd(data);
      onNotify('تم إضافة المنتج بنجاح');
    }
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      onNotify('تم حذف المنتج', 'info');
      setDeleteTarget(null);
    }
  };

  return (
      <div className="space-y-8 animate-fade-in pb-28"> {/* مساحة إضافية بالأسفل للشريط العائم */}

        {/* رأس الصفحة الفخم */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
              <Package className="h-3.5 w-3.5" />
              <span>كتالوج المنتجات</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">إدارة المنتجات</h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">عرض وإدارة منتجات المتجر ({filtered.length} منتج مطابق)</p>
          </div>

          <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="btn-gold !py-3 !px-5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-5 w-5" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>

        {/* شريط البحث والفلاتر */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ابحث بالاسم أو الكود..."
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

        {/* الجدول أو حالة الفراغ */}
        {filtered.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200/80 shadow-xs">
              <EmptyState
                  icon={<Package className="h-10 w-10 text-amber-600" />}
                  title="لا توجد منتجات مطابقة"
                  description="ابدأ بإضافة منتج جديد لتنظيم مبيعاتك"
                  action={
                    <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-gold !py-2.5 !px-5 rounded-xl font-bold flex items-center gap-2 mt-2">
                      <Plus className="h-4 w-4" /> إضافة منتج
                    </button>
                  }
              />
            </div>
        ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50/80 text-stone-400 text-xs border-b border-stone-100">
                    <tr>
                      <th className="px-5 py-4 text-right font-bold">صورة</th>
                      <th className="px-5 py-4 text-right font-bold">الاسم</th>
                      <th className="px-5 py-4 text-right font-bold">الكود</th>
                      <th className="px-5 py-4 text-right font-bold">التصنيف</th>
                      <th className="px-5 py-4 text-right font-bold">السعر</th>
                      <th className="px-5 py-4 text-right font-bold">المخزون</th>
                      <th className="px-5 py-4 text-right font-bold">الحالة</th>
                      <th className="px-5 py-4 text-center font-bold">الإجراءات</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50 font-medium">
                    {paginatedProducts.map((p) => {
                      const level = getStockLevel(p);
                      const stock = getTotalStock(p);
                      const cat = categories.find((c) => c.id === p.categoryId);
                      return (
                          <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                            <td className="px-5 py-3">
                              <img src={p.image} alt={p.name} className="h-14 w-14 rounded-2xl object-cover shadow-xs border border-stone-100" />
                            </td>
                            <td className="px-5 py-3 font-black text-stone-900 max-w-[160px] truncate">{p.name}</td>
                            <td className="px-5 py-3 text-stone-600 font-bold" dir="ltr">{p.code}</td>
                            <td className="px-5 py-3 text-stone-600">{cat?.name || 'بدون تصنيف'}</td>
                            <td className="px-5 py-3 font-black text-amber-600">{formatPrice(p.price)}</td>
                            <td className="px-5 py-3 text-stone-700 font-extrabold">{stock}</td>
                            <td className="px-5 py-3">
                              {level === 'available' && <span className="badge-green">متوفر</span>}
                              {level === 'limited' && <span className="badge-gold">محدود</span>}
                              {level === 'out' && <span className="badge-red">نفد</span>}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200/60 w-fit mx-auto">
                                <button onClick={() => setViewing(p)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="عرض">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setEditing(p); setModalOpen(true); }} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="تعديل">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button onClick={() => setDeleteTarget(p)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="حذف">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>

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

        {/* نافذة الإضافة أو التعديل */}
        <Modal
            open={modalOpen}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            title={editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            size="xl"
        >
          <ProductForm
              initial={editing}
              categories={categories}
              onSave={handleSave}
              onCancel={() => { setModalOpen(false); setEditing(null); }}
          />
        </Modal>

        {/* نافذة عرض تفاصيل المنتج */}
        <Modal
            open={!!viewing}
            onClose={() => setViewing(null)}
            title="تفاصيل المنتج"
            size="lg"
        >
          {viewing && (
              <div className="space-y-6 pt-2">
                <img src={viewing.image} alt={viewing.name} className="w-full h-64 object-cover rounded-2xl shadow-xs border border-stone-100" />

                <div className="grid grid-cols-2 gap-3.5 text-sm">
                  <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/60"><span className="text-stone-400 block text-xs font-bold mb-1">الاسم</span> <strong className="text-stone-900 text-base">{viewing.name}</strong></div>
                  <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/60"><span className="text-stone-400 block text-xs font-bold mb-1">الكود</span> <strong className="text-stone-900 text-base" dir="ltr">{viewing.code}</strong></div>
                  <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/60"><span className="text-stone-400 block text-xs font-bold mb-1">السعر</span> <strong className="text-amber-600 text-base font-black">{formatPrice(viewing.price)}</strong></div>
                  <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/60"><span className="text-stone-400 block text-xs font-bold mb-1">الوزن</span> <strong className="text-stone-900 text-base">{viewing.weight}</strong></div>
                  <div className="col-span-2 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/60"><span className="text-stone-400 block text-xs font-bold mb-1">الوصف</span> <span className="text-stone-700 font-medium leading-relaxed">{viewing.description || 'لا يوجد وصف'}</span></div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <h4 className="font-black text-stone-900 text-base">المتغيرات والمخزون</h4>
                  </div>
                  <div className="border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 text-stone-400 text-xs border-b border-stone-100">
                      <tr>
                        <th className="px-4 py-3 text-right font-bold">المقاس</th>
                        <th className="px-4 py-3 text-right font-bold">اللون</th>
                        <th className="px-4 py-3 text-right font-bold">المخزون</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50 font-medium">
                      {viewing.variants.map((v, i) => (
                          <tr key={i} className="hover:bg-stone-50/50">
                            <td className="px-4 py-3 text-stone-700">{v.size}</td>
                            <td className="px-4 py-3 text-stone-700">{v.color}</td>
                            <td className="px-4 py-3">
                              <span className={`font-black ${v.stock === 0 ? 'text-rose-600' : v.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{v.stock}</span>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
          )}
        </Modal>

        <ConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="حذف المنتج"
            message={`هل أنت متأكد من حذف "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
            confirmLabel="حذف نهائي"
        />
      </div>
  );
}