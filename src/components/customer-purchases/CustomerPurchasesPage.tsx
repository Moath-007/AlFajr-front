import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { customerPurchasesService, currenciesService, ledgerService, type CurrencyDto, type CustomerPurchaseDto, type LedgerAccount } from '@/api';
import { useAuth } from '@/auth';
import AccountPicker from '@/components/finance/AccountPicker';
import RepProductPicker, { type PickedOrderItem } from '@/components/rep/RepProductPicker';
import { RepSelect } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';

type DraftItem = PickedOrderItem & { unitPrice: string };
type StatusFilter = 'all' | 'active' | 'cancelled';
const dateText = (value: string) => new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' });
const purchaseName = (row: CustomerPurchaseDto) => row.account?.name ?? row.customers?.name ?? 'الحساب غير متاح';
const itemName = (item: CustomerPurchaseDto['customer_purchase_items'][number]) => {
  const variant = item.product_variants;
  return [variant?.products?.name ?? variant?.products?.product_name ?? `صنف #${item.product_variant_id}`, variant?.size, variant?.colors?.name ?? variant?.colors?.color_name].filter(Boolean).join(' · ');
};

export default function CustomerPurchasesPage() {
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const [purchases, setPurchases] = useState<CustomerPurchaseDto[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyDto | undefined>();
  const [resourcesError, setResourcesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPurchases(await customerPurchasesService.list()); }
    catch (reason) { setError(apiMessages(reason, 'تعذر تحميل المشتريات.').join('، ')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setResourcesError('');
    void Promise.allSettled([ledgerService.accounts(controller.signal), currenciesService.list(controller.signal)]).then(([accountResult, currencyResult]) => {
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (accountResult.status === 'fulfilled') setAccounts(accountResult.value.filter((account) => !account.is_system && (account.kind === 'General' || account.kind === 'Party')));
      else errors.push(apiMessages(accountResult.reason, 'تعذر تحميل الحسابات.').join('، '));
      if (currencyResult.status === 'fulfilled') {
        const value = currencyResult.value as CurrencyDto[] | { items?: CurrencyDto[]; currencies?: CurrencyDto[] };
        setBaseCurrency((Array.isArray(value) ? value : value.items ?? value.currencies ?? []).find((currency) => currency.is_base));
      } else errors.push(apiMessages(currencyResult.reason, 'تعذر تحميل العملة الأساسية.').join('، '));
      setResourcesError(errors.join('، '));
    });
    return () => controller.abort();
  }, [revision]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return purchases.filter((purchase) => {
      if (status === 'active' && purchase.status !== 'Completed') return false;
      if (status === 'cancelled' && purchase.status !== 'Cancelled') return false;
      if (!query) return true;
      return [purchase.customer_purchase_id, purchaseName(purchase), purchase.notes,
        ...purchase.customer_purchase_items.map(itemName)].some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
    });
  }, [purchases, search, status]);
  const active = purchases.filter((purchase) => purchase.status === 'Completed');
  const total = active.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0);

  return <div className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div><p className="text-xs font-black text-gold-dark">حركة المخزون والحسابات</p><h1 className="text-3xl font-black text-brand">المشتريات من الحسابات</h1><p className="text-sm text-stone-500">شراء البضاعة يزيد المخزون ويسجل قيمتها على الحساب. تُسجَّل الدفعات بسند صرف مستقل.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>تحديث</button>{admin && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> إضافة شراء</button>}</div>
    </header>
    {error && <div className="rep-error" role="alert">{error} <button type="button" className="mr-2 underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {resourcesError && <div className="rep-error" role="alert">{resourcesError} <button type="button" className="mr-2 underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}
    <section className="grid gap-2 sm:grid-cols-3" aria-label="ملخص المشتريات"><Summary label="عمليات فعّالة" value={String(active.length)} /><Summary label="قيمة المشتريات الفعّالة" value={formatMoney(total, baseCurrency)} /><Summary label="عمليات ملغاة" value={String(purchases.length - active.length)} /></section>
    <section className="rounded-2xl border bg-white">
      <div className="flex flex-wrap items-end gap-2 border-b p-4">
        <div className="min-w-[220px] flex-1"><label className="rep-label" htmlFor="purchase-search">البحث</label><input id="purchase-search" className="rep-control" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(30); }} placeholder="رقم العملية أو الحساب أو الصنف" /></div>
        <div className="w-full sm:w-44"><RepSelect value={status} label="الحالة" onChange={(value) => { setStatus(value); setVisibleCount(30); }} options={[{ value: 'all', label: 'كل الحالات' }, { value: 'active', label: 'فعّالة' }, { value: 'cancelled', label: 'ملغاة' }]} /></div>
      </div>
      {loading ? <p className="p-6 text-sm text-stone-500">جارٍ تحميل المشتريات…</p> : filtered.length ? <>
        <div className="divide-y">{filtered.slice(0, visibleCount).map((purchase) => <article key={purchase.customer_purchase_id} className="grid gap-2 p-4 text-sm hover:bg-stone-50 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] lg:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><b className="text-brand">شراء #{purchase.customer_purchase_id}</b><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${purchase.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{purchase.status === 'Completed' ? 'فعّالة' : 'ملغاة'}</span></div><p className="mt-1 font-bold text-stone-700">{purchaseName(purchase)}{purchase.account_id === null && <span className="mr-1 text-xs font-normal text-stone-500">· سجل قديم</span>}</p></div>
          <div className="text-stone-600">{dateText(purchase.created_at)}<p className="text-xs">{purchase.customer_purchase_items.length} أصناف</p></div>
          <b className="whitespace-nowrap text-brand" dir="ltr">{formatMoney(purchase.total_amount, baseCurrency)}</b>
          <button type="button" className="btn-outline text-sm" onClick={() => setSelectedId(purchase.customer_purchase_id)}>التفاصيل</button>
        </article>)}</div>
        {filtered.length > visibleCount && <div className="border-t p-3 text-center"><button type="button" className="btn-outline" onClick={() => setVisibleCount((value) => value + 30)}>عرض المزيد</button></div>}
      </> : <p className="p-8 text-center text-sm text-stone-500">{purchases.length ? 'لا توجد عمليات مطابقة للبحث.' : 'لا توجد مشتريات حتى الآن.'}</p>}
    </section>
    <PurchaseForm open={createOpen} accounts={accounts} baseCurrency={baseCurrency} onClose={() => setCreateOpen(false)} onSaved={(id) => { setCreateOpen(false); setNotice(`سُجّل الشراء #${id} على الحساب.`); setRevision((value) => value + 1); }} />
    <PurchaseDetails id={selectedId} admin={admin} baseCurrency={baseCurrency} accounts={accounts} onClose={() => setSelectedId(null)} onChanged={() => setRevision((value) => value + 1)} />
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-3"><p className="text-sm text-stone-600">{label}</p><b className="mt-1 block text-xl text-brand">{value}</b></div>;
}

function PurchaseForm({ open, purchase, accounts, baseCurrency, onClose, onSaved }: {
  open: boolean; purchase?: CustomerPurchaseDto | null; accounts: LedgerAccount[]; baseCurrency?: CurrencyDto;
  onClose: () => void; onSaved: (id: number) => void;
}) {
  const [accountId, setAccountId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setAccountId(purchase?.account_id ?? null);
    setItems(purchase?.customer_purchase_items.map((item) => ({
      product_variant_id: item.product_variant_id, quantity: item.quantity, stock: 0,
      label: itemName(item), unitPrice: item.unit_price,
    })) ?? []);
    setNotes(purchase?.notes ?? ''); setError('');
  }, [open, purchase]);
  const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice || 0), 0);
  const selectedAccount = accounts.find((account) => account.account_id === accountId);
  const review = () => {
    if (!purchase && !accountId) { setError('اختر الحساب الذي ستسجل عليه المشتريات.'); return; }
    if (!items.length || items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 ||
      !/^\d+(?:\.\d{1,2})?$/.test(item.unitPrice) || Number(item.unitPrice) < 0) || total <= 0) {
      setError('أضف صنفًا على الأقل، وراجع الكميات وأسعار الشراء. يجب أن يكون الإجمالي أكبر من صفر.'); return;
    }
    setError(''); setConfirmOpen(true);
  };
  const save = async () => {
    if (saving || (!purchase && !accountId)) return;
    setSaving(true); setError('');
    try {
      const payload = { items: items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: Number(item.unitPrice) })), notes: notes.trim() || undefined };
      if (purchase) {
        await customerPurchasesService.update(purchase.customer_purchase_id, payload);
        setConfirmOpen(false); onSaved(purchase.customer_purchase_id);
      } else {
        const result = await customerPurchasesService.createForAccount({ ...payload, account_id: accountId! });
        setConfirmOpen(false); onSaved(result.purchase_id);
      }
    } catch (reason) { setConfirmOpen(false); setError(apiMessages(reason, 'تعذر حفظ عملية الشراء.').join('، ')); }
    finally { setSaving(false); }
  };
  return <>
    <Modal open={open} onClose={onClose} title={purchase ? `تعديل الشراء #${purchase.customer_purchase_id}` : 'إضافة شراء'} size="return" mobileFullscreen>
      <div className="space-y-4" dir="rtl">
        {purchase ? <div className="rounded-xl bg-stone-50 p-3 text-sm">الحساب: <b className="text-brand">{purchaseName(purchase)}</b></div>
          : <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} label="الحساب" kinds={['General', 'Party']} />}
        <p className="rounded-xl bg-brand-50 p-3 text-xs text-brand">تزيد الأصناف في المخزون وتُسجل قيمتها على الحساب. دفع المبلغ يتم لاحقًا بسند صرف.</p>
        {error && <div className="rep-error" role="alert">{error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-brand">الأصناف ({items.length})</h3><button type="button" className="btn-outline" onClick={() => setPickerOpen(true)}>إضافة صنف</button></div>
        {items.length ? <div className="max-h-[45vh] space-y-2 overflow-y-auto">{items.map((item) => <div key={item.product_variant_id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_100px_auto] sm:items-end">
          <b className="self-center text-sm text-brand">{item.label}</b>
          <label><span className="rep-label">الكمية</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
          <label><span className="rep-label">سعر الشراء</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="decimal" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, unitPrice: event.target.value } : row))} /></label>
          <b className="pb-2 text-center text-brand" dir="ltr">{formatMoney(item.quantity * Number(item.unitPrice || 0), baseCurrency)}</b>
          <button type="button" className="pb-2 text-sm font-bold text-red-700" onClick={() => setItems((rows) => rows.filter((row) => row.product_variant_id !== item.product_variant_id))}>إزالة</button>
        </div>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-stone-500">لم تُضف أصناف بعد.</p>}
        <label className="block"><span className="rep-label">ملاحظات (اختيارية)</span><textarea className="rep-control resize-none" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="font-bold text-brand">الإجمالي: <b dir="ltr">{formatMoney(total, baseCurrency)}</b></p><div className="flex gap-2"><button type="button" className="btn-outline" onClick={onClose}>إغلاق</button><button type="button" className="btn-primary" disabled={saving} onClick={review}>مراجعة وحفظ</button></div></div>
      </div>
    </Modal>
    <RepProductPicker open={pickerOpen && open} existing={items} onClose={() => setPickerOpen(false)} onAdd={(item) => { setItems((rows) => rows.some((row) => row.product_variant_id === item.product_variant_id) ? rows : [...rows, { ...item, unitPrice: '' }]); setPickerOpen(false); }} purpose="الشراء" />
    <ConfirmDialog open={confirmOpen && open} onClose={() => setConfirmOpen(false)} onConfirm={() => void save()} loading={saving} severity="normal" title={purchase ? 'حفظ تعديل المشتريات' : 'اعتماد الشراء'} message={`سيُسجل الشراء على حساب ${purchase ? purchaseName(purchase) : selectedAccount?.name ?? '—'}، مع تحديث المخزون والدفتر المالي.`} confirmLabel={purchase ? 'حفظ التعديلات' : 'تسجيل الشراء'} details={<div className="flex justify-between gap-2"><span>{items.length} أصناف</span><b>{formatMoney(total, baseCurrency)}</b></div>} />
  </>;
}

function PurchaseDetails({ id, admin, baseCurrency, accounts, onClose, onChanged }: {
  id: number | null; admin: boolean; baseCurrency?: CurrencyDto; accounts: LedgerAccount[];
  onClose: () => void; onChanged: () => void;
}) {
  const [purchase, setPurchase] = useState<CustomerPurchaseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (id === null) return;
    setLoading(true); setError('');
    try { setPurchase(await customerPurchasesService.getById(id)); }
    catch (reason) { setError(apiMessages(reason, 'تعذر تحميل تفاصيل الشراء.').join('، ')); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { setPurchase(null); setEditing(false); setCancelOpen(false); void load(); }, [load]);
  const cancel = async () => {
    if (!purchase || saving) return;
    setSaving(true); setError('');
    try { await customerPurchasesService.cancel(purchase.customer_purchase_id); setCancelOpen(false); await load(); onChanged(); }
    catch (reason) { setCancelOpen(false); setError(apiMessages(reason, 'تعذر إلغاء الشراء.').join('، ')); }
    finally { setSaving(false); }
  };
  return <>
    <Modal open={id !== null} onClose={onClose} title={id === null ? 'تفاصيل الشراء' : `تفاصيل الشراء #${id}`} size="lg" mobileFullscreen>
      <div className="space-y-4" dir="rtl">
        {error && <div className="rep-error" role="alert">{error}</div>}
        {loading && <p className="text-sm text-stone-500">جارٍ تحميل التفاصيل…</p>}
        {purchase && !loading && <>
          <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${purchase.status === 'Completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>{purchase.status === 'Completed' ? 'فعّالة' : 'ملغاة'}</span>{purchase.account_id === null && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">سجل قديم</span>}</div>
          <dl className="grid gap-3 rounded-xl bg-stone-50 p-3 text-sm sm:grid-cols-2"><Detail label="الحساب / الجهة" value={purchaseName(purchase)} /><Detail label="تاريخ التسجيل" value={dateText(purchase.created_at)} /><Detail label="الأصناف" value={String(purchase.customer_purchase_items.length)} /><Detail label="قيمة الشراء" value={formatMoney(purchase.total_amount, baseCurrency)} />{purchase.account_id === null && <><Detail label="المدفوع في السجل القديم" value={formatMoney(purchase.paid_amount, baseCurrency)} /><Detail label="المتبقي في السجل القديم" value={formatMoney(purchase.remaining_amount, baseCurrency)} /></>}{purchase.cancelled_at && <Detail label="تاريخ الإلغاء" value={dateText(purchase.cancelled_at)} />}</dl>
          <div><h3 className="mb-2 font-black text-brand">الأصناف</h3><div className="divide-y overflow-hidden rounded-xl border">{purchase.customer_purchase_items.map((item) => <div key={item.customer_purchase_item_id} className="grid gap-1 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"><b className="text-brand">{itemName(item)}</b><span>الكمية: {item.quantity}</span><span>السعر: {formatMoney(item.unit_price, baseCurrency)}</span><b dir="ltr">{formatMoney(item.quantity * Number(item.unit_price), baseCurrency)}</b></div>)}</div></div>
          {purchase.notes && <div className="rounded-xl border p-3 text-sm"><b className="text-brand">ملاحظات</b><p className="mt-1 whitespace-pre-wrap text-stone-600">{purchase.notes}</p></div>}
          {purchase.account_id === null && purchase.payments.length > 0 && <div><h3 className="mb-2 font-black text-brand">دفعات السجل القديم</h3><div className="space-y-2">{purchase.payments.map((payment) => <div key={payment.payment_id} className="flex flex-wrap justify-between gap-2 rounded-xl border bg-stone-50 p-3 text-sm"><span>دفعة #{payment.payment_id} · {payment.payment_method === 'Cash' ? 'نقد' : 'شيك'} · {payment.cancelled_at ? 'ملغاة' : 'فعّالة'}</span><b>{formatMoney(payment.base_amount ?? payment.amount, baseCurrency)}</b></div>)}</div></div>}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 p-3"><b className="text-brand">إجمالي الشراء</b><b className="text-xl text-brand" dir="ltr">{formatMoney(purchase.total_amount, baseCurrency)}</b></div>
          <div className="flex flex-wrap gap-2 border-t pt-3">{purchase.account_id && admin && <><Link className="btn-outline" to={`/owner/accounts/${purchase.account_id}`}>كشف الحساب</Link><Link className="btn-outline" to={`/owner/vouchers?account=${purchase.account_id}`}>سند صرف</Link></>}{admin && purchase.status === 'Completed' && <><button type="button" className="btn-outline" onClick={() => setEditing(true)}>تعديل</button><button type="button" className="btn-outline text-red-700" onClick={() => setCancelOpen(true)}>إلغاء الشراء</button></>}</div>
        </>}
      </div>
    </Modal>
    <PurchaseForm open={editing} purchase={purchase} accounts={accounts} baseCurrency={baseCurrency} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void load(); onChanged(); }} />
    <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={() => void cancel()} loading={saving} title="إلغاء الشراء" message="ستُعكس حركة المخزون والقيد المالي لهذه العملية. إذا كان لها مردود أو دفعة مرتبطة بالسجل القديم، سيمنع النظام الإلغاء حتى تُعالج." confirmLabel="تأكيد الإلغاء" details={purchase && <div className="flex justify-between gap-2"><span>{purchaseName(purchase)}</span><b>{formatMoney(purchase.total_amount, baseCurrency)}</b></div>} />
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-stone-500">{label}</dt><dd className="font-bold text-brand">{value}</dd></div>;
}
