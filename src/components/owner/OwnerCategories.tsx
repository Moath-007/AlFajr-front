import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Boxes, FolderKanban } from 'lucide-react';
import type { Product, Category } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';

interface OwnerCategoriesProps {
  categories: Category[];
  products: Product[];
  onAdd: (c: Omit<Category, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function OwnerCategories({ categories, products, onAdd, onUpdate, onDelete, onNotify }: OwnerCategoriesProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [viewing, setViewing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: 'Box' });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', icon: 'Box' });
    setModalOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description, icon: c.icon });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) {
      onUpdate(editing.id, form);
      onNotify('تم تحديث التصنيف');
    } else {
      onAdd(form);
      onNotify('تم إضافة التصنيف');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id);
      onNotify('تم حذف التصنيف', 'info');
      setDeleteTarget(null);
    }
  };

  const viewingProducts = useMemo(() => {
    return viewing ? products.filter((p) => p.categoryId === viewing.id) : [];
  }, [viewing, products]);

  return (
      <div className="space-y-8 animate-fade-in pb-16">

        {/* رأس الصفحة */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
              <FolderKanban className="h-3.5 w-3.5" />
              <span>إدارة الأقسام</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">إدارة التصنيفات</h1>
            <p className="text-stone-500 mt-1 text-sm font-medium">عرض وتنظيم أقسام المتجر ({categories.length} تصنيف مسجل)</p>
          </div>

          <button onClick={openAdd} className="btn-gold !py-3 !px-5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:scale-[1.02] transition-transform">
            <Plus className="h-5 w-5" />
            <span>إضافة تصنيف جديد</span>
          </button>
        </div>

        {categories.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-stone-200/80 shadow-xs">
              <EmptyState
                  icon={<Boxes className="h-10 w-10 text-amber-600" />}
                  title="لا توجد تصنيفات مضافة"
                  description="ابدأ بإضافة تصنيفات جديدة لتنظيم منتجات المتجر."
                  action={
                    <button onClick={openAdd} className="btn-gold !py-2.5 !px-5 rounded-xl font-bold flex items-center gap-2 mt-2">
                      <Plus className="h-4 w-4" /> إضافة تصنيف
                    </button>
                  }
              />
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((c) => {
                const count = products.filter((p) => p.categoryId === c.id).length;
                return (
                    <div key={c.id} className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-amber-400 text-2xl font-black shadow-sm group-hover:scale-105 transition-transform shrink-0">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-black text-stone-900 text-lg">{c.name}</h3>
                              <span className="inline-block text-xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg mt-1 border border-amber-200/60">
                          {count} منتج
                        </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-200/60">
                            <button onClick={() => setViewing(c)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="عرض المنتجات">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="تعديل">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(c)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="حذف">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2 mt-2 font-medium">
                          {c.description || 'لا يوجد وصف مضاف لهذا التصنيف.'}
                        </p>
                      </div>
                    </div>
                );
              })}
            </div>
        )}

        {/* نافذة الإضافة أو التعديل */}
        <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editing ? 'تعديل بيانات التصنيف' : 'إضافة تصنيف جديد'}
            size="md"
        >
          <form onSubmit={handleSave} className="space-y-5 pt-2">
            <div>
              <label className="label font-bold text-stone-700 mb-1.5 block text-sm">اسم التصنيف</label>
              <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-medium"
                  placeholder="مثال: مرايا فاخرة"
                  autoFocus
              />
            </div>

            <div>
              <label className="label font-bold text-stone-700 mb-1.5 block text-sm">وصف التصنيف</label>
              <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand min-h-[100px] resize-y text-sm font-medium"
                  placeholder="اكتب وصفاً مختصراً للتصنيف..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <button type="submit" className="btn-primary flex-1 !py-3 rounded-xl font-bold shadow-md">
                {editing ? 'حفظ التعديلات' : 'إضافة التصنيف'}
              </button>
              <button type="button" onClick={() => setModalOpen(false)} className="btn-outline !py-3 px-6 rounded-xl font-bold border-stone-200">
                إلغاء
              </button>
            </div>
          </form>
        </Modal>

        {/* نافذة عرض المنتجات التابعة للتصنيف */}
        <Modal
            open={!!viewing}
            onClose={() => setViewing(null)}
            title={`منتجات تصنيف: ${viewing?.name || ''}`}
            size="lg"
        >
          {viewingProducts.length === 0 ? (
              <div className="py-8">
                <EmptyState title="لا توجد منتجات في هذا التصنيف" description="لم يتم ربط أي منتج بهذا القسم حتى الآن." />
              </div>
          ) : (
              <div className="space-y-3 pt-2">
                {viewingProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-200/80 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                      <img src={p.image} alt={p.name} className="h-14 w-14 rounded-xl object-cover shadow-xs shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-brand text-base truncate">{p.name}</div>
                        <div className="text-xs text-stone-400 font-medium mt-0.5">الكود: <strong className="text-stone-700">{p.code}</strong></div>
                      </div>
                      <span className="font-black text-amber-600 text-base shrink-0">₪{p.price}</span>
                    </div>
                ))}
              </div>
          )}
        </Modal>

        {/* رسالة التأكيد عند الحذف */}
        <ConfirmDialog
            open={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="حذف التصنيف"
            message={`هل أنت متأكد من رغبتك في حذف التصنيف "${deleteTarget?.name}"؟`}
            confirmLabel="حذف نهائي"
        />
      </div>
  );
}
