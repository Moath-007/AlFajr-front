import { useEffect, useMemo, useState } from 'react';
import { ledgerService, returnsService, type LedgerAccount } from '@/api';
import RepProductPicker, { type PickedOrderItem } from '@/components/rep/RepProductPicker';
import { apiMessages } from '@/components/rep/repOrderUtils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';
import AccountPicker from './AccountPicker';

type DraftItem = PickedOrderItem & { price: string };

export default function AccountReturnLauncher({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (id: number) => void }) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const type = 'PurchaseReturn' as const;
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * Number(item.price || 0), 0), [items]);
  const account = accounts.find((item) => item.account_id === accountId);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAccountId(null); setItems([]); setNotes(''); setError(''); setLoading(true);
    ledgerService.accounts(controller.signal).then((rows) => {
      if (!controller.signal.aborted) setAccounts(rows.filter((row) => !row.is_system && (row.kind === 'General' || row.kind === 'Party')));
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل الحسابات.').join('، '));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  const review = () => {
    if (!accountId) { setError('اختر الحساب الذي سيسجل عليه المردود.'); return; }
    if (!items.length) { setError('أضف صنفًا واحدًا على الأقل.'); return; }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 ||
      !/^\d+(?:\.\d{1,2})?$/.test(item.price) || Number(item.price) <= 0)) {
      setError('راجع كمية وسعر كل صنف. السعر يجب أن يكون موجبًا وبمنزلتين عشريتين كحد أقصى.'); return;
    }
    setError('');
    setConfirmOpen(true);
  };
  const submit = async () => {
    if (saving || !accountId) return;
    setSaving(true); setError('');
    try {
      const response = await returnsService.createPurchaseForAccount({
        account_id: accountId, type,
        items: items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: Number(item.price) })),
        notes: notes.trim() || undefined,
      });
      setConfirmOpen(false);
      onSaved(response.return_id);
    } catch (reason) {
      setConfirmOpen(false);
      setError(apiMessages(reason, 'تعذر تسجيل المردود.').join('، '));
    } finally {
      setSaving(false);
    }
  };

  return <>
    <Modal open={open} onClose={onClose} title="إنشاء مردود شراء" size="return" mobileFullscreen>
      <div className="space-y-4" dir="rtl">
        <div className="grid gap-3 md:grid-cols-[280px_minmax(0,1fr)]">
          <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} label="الحساب" kinds={['General', 'Party']} disabled={loading} />
        </div>
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand">{'سيخرج الصنف من المخزون وتُسجل قيمته مستحقة على الحساب.'}</p>
        {error && <div className="rep-error" role="alert">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-brand">الأصناف ({items.length})</h3><button type="button" className="btn-outline" onClick={() => setPickerOpen(true)}>إضافة صنف</button></div>
        {items.length ? <div className="max-h-[45vh] space-y-2 overflow-y-auto">{items.map((item) => <div key={item.product_variant_id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_90px_auto] sm:items-end">
          <b className="self-center text-sm text-brand">{item.label}</b>
          <label><span className="rep-label">الكمية</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
          <label><span className="rep-label">سعر المردود</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="decimal" min="0.01" step="0.01" value={item.price} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, price: event.target.value } : row))} /></label>
          <b className="pb-2 text-center text-brand" dir="ltr">{formatMoney(item.quantity * Number(item.price || 0))}</b>
          <button type="button" className="pb-2 text-sm font-bold text-red-700" onClick={() => setItems((rows) => rows.filter((row) => row.product_variant_id !== item.product_variant_id))}>إزالة</button>
        </div>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-stone-500">لم تُضف أصناف بعد.</p>}
        <label className="block"><span className="rep-label">ملاحظات (اختيارية)</span><textarea className="rep-control resize-none" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="font-bold text-brand">الإجمالي: <span dir="ltr">{formatMoney(total)}</span></p><div className="flex gap-2"><button type="button" className="btn-outline" onClick={onClose}>إغلاق</button><button type="button" className="btn-primary" disabled={loading || saving} onClick={review}>مراجعة واعتماد</button></div></div>
      </div>
    </Modal>
    <RepProductPicker open={pickerOpen && open} existing={items} onClose={() => setPickerOpen(false)} onAdd={(item) => { setItems((rows) => rows.some((row) => row.product_variant_id === item.product_variant_id) ? rows : [...rows, { ...item, price: String(item.display_price ?? '') }]); setPickerOpen(false); }} purpose="المردود" />
    <ConfirmDialog open={confirmOpen && open} onClose={() => setConfirmOpen(false)} onConfirm={() => void submit()} loading={saving} severity="normal" title="اعتماد المردود" message={`سيُسجل مردود ${'شراء'} على حساب ${account?.name ?? '—'}، مع تحديث المخزون والدفتر المالي.`} confirmLabel="اعتماد المردود" details={<div className="flex justify-between gap-2"><span>{items.length} أصناف</span><b>{formatMoney(total)}</b></div>} />
  </>;
}
