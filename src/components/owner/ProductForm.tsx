import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Product, Category, ColorOption, Variant, SizeOption } from '@/types';

interface ProductFormProps {
  initial: Product | null;
  categories: Category[];
  onSave: (data: Omit<Product, 'id'>) => void;
  onCancel: () => void;
}

const defaultColors: ColorOption[] = [
  { name: 'أبيض', hex: '#f5f5f5' },
  { name: 'أسود', hex: '#1a1a1a' },
  { name: 'كروم', hex: '#c0c0c0' },
  { name: 'ذهبي', hex: '#9C7537' },
  { name: 'بني', hex: '#8B5E3C' },
  { name: 'بيج', hex: '#e8dcc8' },
  { name: 'رمادي', hex: '#8a8a8a' },
  { name: 'شفاف', hex: '#e8e8e8' },
  { name: 'أزرق', hex: '#3b6e8f' },
  { name: 'فضي', hex: '#dcdcdc' },
];

export default function ProductForm({ initial, categories, onSave, onCancel }: ProductFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    price: initial?.price || 0,
    wholesalePrice: initial?.wholesalePrice || 0,
    description: initial?.description || '',
    weight: initial?.weight || '',
    categoryId: initial?.categoryId || categories[0]?.id || '',
    image: initial?.image || 'https://images.pexels.com/photos/3148596/pexels-photo-3148596.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    images: initial?.images || [],
    sizes: (initial?.sizes || []) as SizeOption[],
    colors: initial?.colors || [],
    variants: initial?.variants || [],
  });

  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePrice, setNewSizePrice] = useState(0);
  const [newSizeWholesale, setNewSizeWholesale] = useState(0);

  const [newImageUrl, setNewImageUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // إضافة مقاس جديد بقيمه
  const addSize = () => {
    const sName = newSizeName.trim();
    if (!sName) return;

    const sizeObj: SizeOption = {
      size: sName,
      price: newSizePrice > 0 ? newSizePrice : form.price,
      wholesalePrice: newSizeWholesale > 0 ? newSizeWholesale : form.wholesalePrice,
    };

    // التحقق إذا كان المقاس موجود مسبقاً
    const exists = form.sizes.some((s) => s.size === sName);
    if (!exists) {
      setForm({ ...form, sizes: [...form.sizes, sizeObj] });
      setNewSizeName('');
      setNewSizePrice(0);
      setNewSizeWholesale(0);
    }
  };

  const removeSize = (sizeName: string) => {
    setForm({
      ...form,
      sizes: form.sizes.filter((s) => s.size !== sizeName),
      variants: form.variants.filter((v) => v.size !== sizeName),
    });
  };

  // التعامل مع الصور المتعددة (images)
  const addImage = () => {
    const url = newImageUrl.trim();
    if (url && !form.images.includes(url)) {
      setForm({ ...form, images: [...form.images, url] });
      setNewImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setForm({ ...form, images: form.images.filter((img) => img !== url) });
  };

  const toggleColor = (c: ColorOption) => {
    const exists = form.colors.find((x) => x.name === c.name);
    if (exists) {
      setForm({
        ...form,
        colors: form.colors.filter((x) => x.name !== c.name),
        variants: form.variants.filter((v) => v.color !== c.name),
      });
    } else {
      setForm({ ...form, colors: [...form.colors, c] });
    }
  };

  const updateVariantStock = (sizeName: string, colorName: string, stock: number) => {
    const existing = form.variants.find((v) => v.size === sizeName && v.color === colorName);
    if (existing) {
      setForm({
        ...form,
        variants: form.variants.map((v) =>
            v.size === sizeName && v.color === colorName ? { ...v, stock } : v
        ),
      });
    } else {
      setForm({ ...form, variants: [...form.variants, { size: sizeName, color: colorName, stock }] });
    }
  };

  const getVariantStock = (sizeName: string, colorName: string): number => {
    const v = form.variants.find((v) => v.size === sizeName && v.color === colorName);
    return v ? v.stock : 0;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'الرجاء إدخال اسم المنتج';
    if (!form.code.trim()) e.code = 'الرجاء إدخال كود المنتج';
    if (form.price <= 0) e.price = 'السعر يجب أن يكون أكبر من صفر';
    if (!form.categoryId) e.categoryId = 'الرجاء اختيار تصنيف';
    if (form.sizes.length === 0) e.sizes = 'أضف مقاس واحد على الأقل';
    if (form.colors.length === 0) e.colors = 'اختر لون واحد على الأقل';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // تجهيز المتغيرات الكاملة للمخزون بناءً على المقاسات والألوان المتاحة
    const completeVariants: Variant[] = [];
    form.sizes.forEach((s) => {
      form.colors.forEach((color) => {
        const existing = form.variants.find((v) => v.size === s.size && v.color === color.name);
        completeVariants.push({ size: s.size, color: color.name, stock: existing ? existing.stock : 0 });
      });
    });

    onSave({
      ...form,
      variants: completeVariants
    });
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* الصورة الرئيسية */}
        <div>
          <label className="label">رابط الصورة الرئيسية</label>
          <div className="flex gap-3">
            <div className="h-20 w-20 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
              <img src={form.image} alt="" className="h-full w-full object-cover" />
            </div>
            <input
                type="text"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="input flex-1"
                placeholder="رابط الصورة الرئيسية"
                dir="ltr"
            />
          </div>
        </div>

        {/* معرض الصور الإضافية (images) */}
        <div>
          <label className="label">صور إضافية للمنتج (معرض الصور)</label>
          <div className="flex gap-2 mb-2">
            <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="input flex-1"
                placeholder="أضف رابط صورة إضافية"
                dir="ltr"
            />
            <button type="button" onClick={addImage} className="btn-outline shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.images.map((imgUrl) => (
                    <div key={imgUrl} className="relative h-14 w-14 rounded-lg overflow-hidden border border-stone-200 group">
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                      <button
                          type="button"
                          onClick={() => removeImage(imgUrl)}
                          className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                ))}
              </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">اسم المنتج</label>
            <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="اسم المنتج"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="label">كود المنتج</label>
            <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className={`input ${errors.code ? 'input-error' : ''}`}
                placeholder="A8"
                dir="ltr"
            />
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
          </div>
          <div>
            <label className="label">السعر الافتراضي (₪)</label>
            <input
                type="number"
                value={form.price || ''}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className={`input ${errors.price ? 'input-error' : ''}`}
                placeholder="250"
                min="0"
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="label">سعر الجملة الافتراضي (₪)</label>
            <input
                type="number"
                value={form.wholesalePrice || ''}
                onChange={(e) => setForm({ ...form, wholesalePrice: Number(e.target.value) })}
                className="input"
                placeholder="200"
                min="0"
            />
          </div>
          <div>
            <label className="label">الوزن</label>
            <input
                type="text"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="input"
                placeholder="2.5 كغم"
            />
          </div>
          <div>
            <label className="label">التصنيف</label>
            <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={`input ${errors.categoryId ? 'input-error' : ''}`}
            >
              <option value="">اختر تصنيف</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
          </div>
        </div>

        <div>
          <label className="label">الوصف</label>
          <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[80px] resize-y"
              placeholder="وصف المنتج..."
          />
        </div>

        {/* المقاسات مع أسعارها الخاصة (sizes) */}
        <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
          <label className="label font-bold">إدارة المقاسات وأسعارها</label>
          <div className="grid sm:grid-cols-3 gap-2">
            <input
                type="text"
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value)}
                className="input bg-white"
                placeholder="المقاس (مثال: 80سم)"
            />
            <input
                type="number"
                value={newSizePrice || ''}
                onChange={(e) => setNewSizePrice(Number(e.target.value))}
                className="input bg-white"
                placeholder="سعر هذا المقاس"
                min="0"
            />
            <div className="flex gap-2">
              <input
                  type="number"
                  value={newSizeWholesale || ''}
                  onChange={(e) => setNewSizeWholesale(Number(e.target.value))}
                  className="input bg-white flex-1"
                  placeholder="سعر الجملة"
                  min="0"
              />
              <button type="button" onClick={addSize} className="btn-primary shrink-0 px-4">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {form.sizes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.sizes.map((s) => (
                    <span key={s.size} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-lg bg-white border border-stone-200 text-stone-700 shadow-sm">
                <span>{s.size}</span>
                <span className="text-xs text-brand font-semibold">({s.price} ₪)</span>
                <button type="button" onClick={() => removeSize(s.size)} className="text-stone-400 hover:text-red-500">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
                ))}
              </div>
          )}
          {errors.sizes && <p className="text-xs text-red-500 mt-1">{errors.sizes}</p>}
        </div>

        {/* الألوان */}
        <div>
          <label className="label">الألوان المتاحة</label>
          <div className="flex flex-wrap gap-2">
            {defaultColors.map((c) => {
              const selected = form.colors.find((x) => x.name === c.name);
              return (
                  <button
                      key={c.name}
                      type="button"
                      onClick={() => toggleColor(c)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border-2 transition ${
                          selected ? 'border-brand bg-brand-50 text-brand' : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                  >
                    <span className="h-4 w-4 rounded-full border border-stone-300" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </button>
              );
            })}
          </div>
          {errors.colors && <p className="text-xs text-red-500 mt-1">{errors.colors}</p>}
        </div>

        {/* جدول المخزون (variants) */}
        {form.sizes.length > 0 && form.colors.length > 0 && (
            <div>
              <label className="label">إدارة المخزون حسب المتغير (مقاس + لون)</label>
              <div className="border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    <th className="px-3 py-2 text-right font-bold">المقاس</th>
                    <th className="px-3 py-2 text-right font-bold">اللون</th>
                    <th className="px-3 py-2 text-right font-bold">المخزون</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                  {form.sizes.map((s) =>
                      form.colors.map((color) => (
                          <tr key={`${s.size}-${color.name}`}>
                            <td className="px-3 py-2 text-stone-600 font-bold">{s.size}</td>
                            <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5 text-stone-600">
                          <span className="h-3 w-3 rounded-full border border-stone-300" style={{ backgroundColor: color.hex }} />
                          {color.name}
                        </span>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                  type="number"
                                  value={getVariantStock(s.size, color.name)}
                                  onChange={(e) => updateVariantStock(s.size, color.name, Math.max(0, Number(e.target.value)))}
                                  className="input !py-1.5 w-24"
                                  min="0"
                              />
                            </td>
                          </tr>
                      ))
                  )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-stone-200">
          <button type="submit" className="btn-primary flex-1">
            {initial ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </button>
          <button type="button" onClick={onCancel} className="btn-outline">
            إلغاء
          </button>
        </div>
      </form>
  );
}
