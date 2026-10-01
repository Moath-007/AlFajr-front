import { useEffect, useMemo, useRef, useState } from 'react';
import { returnsService } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';

export interface ReturnSourceItem { productVariantId: number; label: string; quantity: number; unitPrice?: number }
export default function CreateReturnModal({ open, sourceType, sourceId, items, saleAccountName, onClose, onSaved }: { open: boolean; sourceType: 'SalesReturn' | 'PurchaseReturn'; sourceId: number; items: ReturnSourceItem[]; saleAccountName?: string | null; onClose: () => void; onSaved: (message: string) => void }) {
  const displayItems = useMemo(() => {
    const byVariant = new Map<number, ReturnSourceItem>();
    for (const item of items) {
      const prior = byVariant.get(item.productVariantId);
      byVariant.set(item.productVariantId, prior ? { ...prior, quantity: prior.quantity + item.quantity } : item);
    }
    return [...byVariant.values()];
  }, [items]);
  const sourceItems = useRef(displayItems);
  sourceItems.current = displayItems;
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setQuantities({}); setNotes(''); setError('');
    if (sourceType === 'PurchaseReturn') { setPrices(Object.fromEntries(sourceItems.current.map((item) => [item.productVariantId, String(item.unitPrice ?? '')]))); return; }
    const controller = new AbortController(); setLoading(true);
    returnsService.salesDefaults(sourceId, controller.signal).then((response) => setPrices(Object.fromEntries(response.items.map((item) => [item.product_variant_id, item.unit_price])))).catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل أسعار الفاتورة.').join('، ')); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [open, sourceId, sourceType]);
  const submit = async () => {
    if (saving || loading) return;
    const selected = displayItems.map((item) => ({ product_variant_id: item.productVariantId, quantity: quantities[item.productVariantId] ?? 0, unit_price: Number(prices[item.productVariantId]) })).filter((item) => item.quantity > 0);
    if (!selected.length) { setError('اختر صنفًا واحدًا على الأقل وحدد كمية المردود.'); return; }
    if (selected.some((item) => !Number.isInteger(item.quantity) || !Number.isFinite(item.unit_price) || item.unit_price <= 0 || Math.abs(Math.round(item.unit_price * 100) - item.unit_price * 100) > 1e-8)) { setError('راجع الكميات والأسعار. السعر يجب أن يكون موجبًا وبمنزلتين عشريتين كحد أقصى.'); return; }
    if (!window.confirm(`اعتماد المردود بقيمة ${formatMoney(selected.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))}؟`)) return;
    setSaving(true); setError('');
    try { const data = { items: selected, notes: notes.trim() || undefined }; const response = sourceType === 'SalesReturn' ? await returnsService.createSales(sourceId, data) : await returnsService.createPurchase(sourceId, data); onSaved(response.message); }
    catch (reason) { setError(apiMessages(reason, 'تعذر إنشاء المردود.').join('، ')); }
    finally { setSaving(false); }
  };
  if (!open) return null;
  return <Modal open onClose={onClose} title={sourceType === 'SalesReturn' ? 'مردود مبيعات' : 'مردود مشتريات'} size="lg" mobileFullscreen><div className="space-y-4" dir="rtl">
    {sourceType === 'SalesReturn' && <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-700">فاتورة #{sourceId} · حساب الفاتورة: <strong>{saleAccountName ?? 'غير محدد'}</strong></p>}
    <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{sourceType === 'SalesReturn' ? 'السعر الافتراضي هو سعر بيع القطعة الفعلي بعد خصومات الفاتورة. يمكنك تعديله قبل الاعتماد.' : 'السعر المالي للمردود قابل للتعديل ومستقل عن متوسط تكلفة المخزون.'}</p>
    {error && <div className="rep-error">{error}</div>}{loading && <p>جارٍ تحميل السعر الفعلي من الفاتورة…</p>}
    <div className="max-h-[440px] space-y-3 overflow-y-auto">{displayItems.map((item) => <div key={item.productVariantId} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_90px_130px]"><div><b className="block text-brand">{item.label}</b><small className="text-stone-500">الكمية الأصلية: {item.quantity}</small></div><label><span className="rep-label">الكمية</span><input className="rep-control" type="number" min="0" max={item.quantity} step="1" value={quantities[item.productVariantId] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.productVariantId]: Math.max(0, Math.min(item.quantity, Number(event.target.value) || 0)) }))} /></label><label><span className="rep-label">سعر القطعة المالي</span><input className="rep-control" type="number" min="0.01" step="0.01" value={prices[item.productVariantId] ?? ''} onChange={(event) => setPrices((current) => ({ ...current, [item.productVariantId]: event.target.value }))} /></label></div>)}</div>
    <label className="block"><span className="rep-label">ملاحظات</span><textarea className="rep-control" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>إلغاء</button><button className="btn-primary" disabled={saving || loading} onClick={() => void submit()}>{saving ? 'جارٍ الاعتماد…' : 'اعتماد المردود'}</button></div>
  </div></Modal>;
}
