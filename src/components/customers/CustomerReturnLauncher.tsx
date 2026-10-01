import { useState } from 'react';
import { returnsService, type ReturnType } from '@/api';
import RepProductPicker, { type PickedOrderItem } from '@/components/rep/RepProductPicker';
import { apiMessages } from '@/components/rep/repOrderUtils';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';

type Draft = PickedOrderItem & { price: string };
export default function CustomerReturnLauncher({ customerId, type, onClose, onSaved }: { customerId: number; type: ReturnType | null; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<Draft[]>([]); const [picker, setPicker] = useState(false); const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  if (!type) return null;
  const submit = async () => {
    if (saving || !items.length || items.some((item) => item.quantity < 1 || !/^\d+(?:\.\d{1,2})?$/.test(item.price) || Number(item.price) <= 0)) { setError('راجع الأصناف والكميات وأسعار المردود بمنزلتين عشريتين.'); return; }
    const amount = items.reduce((sum, item) => sum + item.quantity * Number(item.price), 0);
    if (!window.confirm(`اعتماد مردود بقيمة ${formatMoney(amount)}؟`)) return;
    setSaving(true); setError('');
    try { await returnsService.createDirect(customerId, { type, items: items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: Number(item.price) })), notes: notes.trim() || undefined }); onSaved(); }
    catch (reason) { setError(apiMessages(reason, 'تعذر إنشاء المردود.').join('، ')); }
    finally { setSaving(false); }
  };
  return <><Modal open onClose={onClose} title={type === 'SalesReturn' ? 'مردود بيع مباشر' : 'مردود شراء مباشر'} size="lg" mobileFullscreen><div className="space-y-4" dir="rtl"><p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">سعر المردود المالي تختاره هنا. متوسط سعر الشراء المعلوماتي مستقل عنه، والكمية السالبة مسموحة.</p>{error && <div className="rep-error">{error}</div>}<button className="btn-outline" onClick={() => setPicker(true)}>إضافة صنف</button><div className="space-y-2">{items.map((item) => <div key={item.product_variant_id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_85px_120px_auto]"><b className="text-sm text-brand">{item.label}</b><label><span className="rep-label">الكمية</span><input className="rep-control" type="number" min="1" step="1" value={item.quantity} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, quantity: Number(event.target.value) } : row))} /></label><label><span className="rep-label">سعر المردود</span><input className="rep-control" type="number" min="0.01" step="0.01" value={item.price} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, price: event.target.value } : row))} /></label><button className="text-sm text-red-700" onClick={() => setItems((rows) => rows.filter((row) => row.product_variant_id !== item.product_variant_id))}>إزالة</button></div>)}</div><label className="block"><span className="rep-label">ملاحظات</span><textarea className="rep-control" value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>إلغاء</button><button className="btn-primary" disabled={saving} onClick={() => void submit()}>{saving ? 'جارٍ الحفظ…' : 'اعتماد المردود'}</button></div></div></Modal><RepProductPicker open={picker} existing={items} onClose={() => setPicker(false)} onAdd={(item) => { setItems((rows) => rows.some((row) => row.product_variant_id === item.product_variant_id) ? rows : [...rows, { ...item, price: String(item.display_price ?? '') }]); setPicker(false); }} allowOutOfStock /></>;
}
