import { useState } from 'react';
import { Save, Phone, MapPin, Mail, Clock } from 'lucide-react';
import type { ShopSettings } from '@/types';

interface OwnerSettingsProps {
  settings: ShopSettings;
  onUpdate: (updates: Partial<ShopSettings>) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function OwnerSettings({ settings, onUpdate, onNotify }: OwnerSettingsProps) {
  const [form, setForm] = useState(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(form);
    onNotify('تم حفظ الإعدادات بنجاح');
  };

  const updatePhone = (i: number, value: string) => {
    const phones = [...form.phones];
    phones[i] = value;
    setForm({ ...form, phones });
  };

  const addPhone = () => setForm({ ...form, phones: [...form.phones, ''] });
  const removePhone = (i: number) => setForm({ ...form, phones: form.phones.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-brand">إعدادات المحل</h1>
        <p className="text-stone-500 mt-1 text-sm">تعديل معلومات المتجر الأساسية</p>
      </div>

      <form onSubmit={handleSave} className="grid lg:grid-cols-[200px_1fr] gap-6">
        {/* Logo */}
        <div className="card p-5 text-center">
          <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-2xl bg-brand text-gold text-4xl font-extrabold mb-3">
            ف
          </div>
          <p className="text-xs text-stone-500">شعار المحل</p>
          <p className="text-xs text-stone-400 mt-1">(سيتم إضافته لاحقاً)</p>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">اسم الشركة</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input" />
          </div>

          <div>
            <label className="label flex items-center gap-1"><Phone className="h-4 w-4" /> أرقام الهاتف</label>
            <div className="space-y-2">
              {form.phones.map((phone, i) => (
                <div key={i} className="flex gap-2">
                  <input type="tel" value={phone} onChange={(e) => updatePhone(i, e.target.value)}
                    className="input flex-1" dir="ltr" placeholder="05xxxxxxxx" />
                  {form.phones.length > 1 && (
                    <button type="button" onClick={() => removePhone(i)} className="btn-ghost text-red-600 !px-3">حذف</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPhone} className="btn-outline !py-1.5 !text-xs">+ إضافة رقم</button>
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1"><Mail className="h-4 w-4" /> البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input" dir="ltr" />
          </div>

          <div>
            <label className="label flex items-center gap-1"><MapPin className="h-4 w-4" /> العنوان</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input" />
          </div>

          <div>
            <label className="label flex items-center gap-1"><MapPin className="h-4 w-4" /> المدينة</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input" />
          </div>

          <div>
            <label className="label flex items-center gap-1"><Clock className="h-4 w-4" /> ساعات العمل</label>
            <input type="text" value={form.workingHours} onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
              className="input" />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary">
              <Save className="h-4 w-4" />
              حفظ التغييرات
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
