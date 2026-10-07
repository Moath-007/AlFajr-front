import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Plus, SlidersHorizontal, ChevronLeft, ChevronRight, Pencil, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { purchasesService, currenciesService, accountsService, type CurrencyDto, type PurchaseDto, type AccountIdentityOption } from '@/api';
import { useAuth } from '@/auth';
import AccountPicker from '@/components/finance/AccountPicker';
import type { PickedOrderItem } from '@/components/rep/RepProductPicker';
import ReturnVariantSelect from '@/components/finance/ReturnVariantSelect';
import CheckFiltersPopover from '@/components/finance/CheckFiltersPopover';
import './PurchasesPage.css';
import { RepSelect, RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';
import { businessToday } from '@/components/finance/accountUiUtils';

type DraftItem = PickedOrderItem & { unitPrice: string };
type StatusFilter = 'all' | 'active' | 'cancelled';
const dateText = (value: string) => new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { timeZone: 'Asia/Hebron', day: '2-digit', month: '2-digit', year: 'numeric' });
const purchaseName = (row: PurchaseDto) => row.account?.name ?? 'الحساب غير متاح';
const itemName = (item: PurchaseDto['customer_purchase_items'][number]) => {
  const variant = item.product_variants;
  return [variant?.products?.name ?? variant?.products?.product_name ?? `صنف #${item.product_variant_id}`, variant?.size, variant?.colors?.name ?? variant?.colors?.color_name].filter(Boolean).join(' · ');
};

export default function PurchasesPage() {
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const [purchases, setPurchases] = useState<PurchaseDto[]>([]);
  const [accounts, setAccounts] = useState<AccountIdentityOption[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<CurrencyDto | undefined>();
  const [resourcesError, setResourcesError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [accountFilter, setAccountFilter] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const advancedTrigger = useRef<HTMLButtonElement>(null);
  const closeAdvanced = useCallback(() => { setAdvanced(false); advancedTrigger.current?.focus(); }, []);
  useEffect(() => { const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300); return () => clearTimeout(timer); }, [searchInput]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [count, setCount] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(params.get('purchase')) || null);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try { const response = await purchasesService.list({page,limit:20,search,
      ...(status !== 'all' && {status:status === 'active' ? 'Completed' : 'Cancelled'}),date_from:from,date_to:to,account_id:accountFilter ?? undefined}, signal);
      if (!signal?.aborted) { if (page > Math.max(1, response.pagination.total_pages)) setPage(Math.max(1, response.pagination.total_pages)); setPurchases(response.items); setPages(response.pagination.total_pages); setCount(response.pagination.total); }
    }
    catch (reason) { if (!signal?.aborted) setError(apiMessages(reason, 'تعذر تحميل المشتريات.').join('، ')); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page,search,status,from,to,accountFilter]);
  useEffect(() => { const c=new AbortController();void load(c.signal);return()=>c.abort(); }, [load, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setResourcesError('');
    void Promise.allSettled([accountsService.allOptions({type:"General"},controller.signal), currenciesService.list(controller.signal)]).then(([accountResult, currencyResult]) => {
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (accountResult.status === 'fulfilled') setAccounts(accountResult.value);
      else errors.push(apiMessages(accountResult.reason, 'تعذر تحميل الحسابات.').join('، '));
      if (currencyResult.status === 'fulfilled') {
        const value = currencyResult.value as CurrencyDto[] | { items?: CurrencyDto[]; currencies?: CurrencyDto[] };
        setBaseCurrency((Array.isArray(value) ? value : value.items ?? value.currencies ?? []).find((currency) => currency.is_base));
      } else errors.push(apiMessages(currencyResult.reason, 'تعذر تحميل العملة الأساسية.').join('، '));
      setResourcesError(errors.join('، '));
    });
    return () => controller.abort();
  }, [revision]);

  const filtered = purchases;
  const clearFilters = () => { setSearchInput(''); setSearch(''); setStatus('all'); setAccountFilter(null); setFrom(''); setTo(''); setPage(1); };
  const chips = [
    ...(searchInput ? [{ label: searchInput, clear: () => { setSearchInput(''); setSearch(''); setPage(1); } }] : []),
    ...(status !== 'all' ? [{ label: status === 'active' ? 'فعّالة' : 'ملغاة', clear: () => { setStatus('all'); setPage(1); } }] : []),
    ...(accountFilter ? [{ label: accounts.find(a => a.account_id === accountFilter)?.name ?? 'حساب محدد', clear: () => { setAccountFilter(null); setPage(1); } }] : []),
    ...(from || to ? [{ label: (from || 'البداية') + ' — ' + (to || 'الآن'), clear: () => { setFrom(''); setTo(''); setPage(1); } }] : []),
  ];

  return <div className={`purchases-page space-y-3 ${pages > 1 ? "purchases-has-pagination" : ""}`} dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div><p className="text-xs font-black text-gold-dark">حركة المخزون والحسابات</p><h1 className="text-3xl font-black text-brand">المشتريات</h1><p className="text-sm text-stone-500">شراء البضاعة يزيد المخزون ويسجل قيمتها على الحساب. تُسجَّل الدفعات بسند صرف مستقل.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" disabled={loading} onClick={() => setRevision((value) => value + 1)}>تحديث</button>{admin && <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> إضافة شراء</button>}</div>
    </header>
    {error && <div className="rep-error" role="alert">{error} <button type="button" className="mr-2 underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {resourcesError && <div className="rep-error" role="alert">{resourcesError} <button type="button" className="mr-2 underline" onClick={() => setRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}
    <section className="purchase-quick-filters" aria-label="فلاتر المشتريات">
      <label><span className="rep-label">البحث</span><input type="search" className="rep-control" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="رقم الشراء أو الحساب أو الصنف" /></label>
      <RepSelect value={status} label="الحالة" onChange={value => { setStatus(value); setPage(1); }} options={[{value:'all',label:'كل الحالات'},{value:'active',label:'فعّالة'},{value:'cancelled',label:'ملغاة'}]} />
      <button ref={advancedTrigger} type="button" className="btn-outline" aria-haspopup="dialog" aria-expanded={advanced} onClick={() => setAdvanced(current => !current)}><SlidersHorizontal size={17} />فلاتر إضافية{accountFilter || from || to ? ' (' + (Number(!!accountFilter) + Number(!!from || !!to)) + ')' : ''}</button>
    </section>
    <CheckFiltersPopover open={advanced} trigger={advancedTrigger} onClose={closeAdvanced} footer={<div className="flex items-center justify-between gap-2"><span className="text-xs text-stone-600">الفلاتر تُطبّق تلقائيًا</span><button type="button" className="btn-ghost" onClick={clearFilters}>مسح الكل</button></div>}>
      <div className="space-y-3"><AccountPicker accounts={accounts} value={accountFilter} onChange={id => { setAccountFilter(id); setPage(1); }} label="الحساب العام" kinds={['General']} /><RepDateInput label="من تاريخ" value={from} max={to || undefined} onChange={value => { setFrom(value); setPage(1); }} /><RepDateInput label="إلى تاريخ" value={to} min={from || undefined} onChange={value => { setTo(value); setPage(1); }} /></div>
    </CheckFiltersPopover>
    {chips.length > 0 && <div className="purchase-filter-chips">{chips.map((chip,index) => <button type="button" key={index} onClick={chip.clear}>{chip.label} ×</button>)}<button type="button" onClick={clearFilters}>مسح الكل</button></div>}
    <p className="text-sm text-stone-500">{count} شراء · صفحة {page} من {pages || 1}</p>
    <section className="purchase-results" aria-label="قائمة المشتريات">
      {loading ? <p role="status" className="purchase-empty">جارٍ تحميل المشتريات…</p> : error ? null : filtered.length ? <>
        <table className="purchase-list-table"><thead><tr>{['رقم الشراء','الحساب العام','التاريخ','الإجمالي','البنود','الحالة'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map(purchase => <tr key={purchase.customer_purchase_id} tabIndex={0} aria-label={'فتح شراء ' + purchase.customer_purchase_id} onClick={() => setSelectedId(purchase.customer_purchase_id)} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter',' '].includes(event.key)) { event.preventDefault(); setSelectedId(purchase.customer_purchase_id); } }}><td><b>#{purchase.customer_purchase_id}</b></td><td>{purchaseName(purchase)}</td><td>{dateText(purchase.purchase_date)}</td><td><b dir="ltr">{formatMoney(purchase.total_amount, baseCurrency)}</b></td><td>{purchase.customer_purchase_items.length}</td><td><PurchaseStatus purchase={purchase} /></td></tr>)}</tbody></table>
        <div className="purchase-list-cards">{filtered.map(purchase => <button type="button" key={purchase.customer_purchase_id} className="purchase-list-card" onClick={() => setSelectedId(purchase.customer_purchase_id)}><div><b>شراء #{purchase.customer_purchase_id}</b><PurchaseStatus purchase={purchase} /></div><p>{purchaseName(purchase)}</p><div><span>{dateText(purchase.purchase_date)} · {purchase.customer_purchase_items.length} بند</span><b dir="ltr">{formatMoney(purchase.total_amount, baseCurrency)}</b></div></button>)}</div>
      </> : <p className="purchase-empty">{chips.length ? 'لا توجد مشتريات مطابقة للفلاتر.' : 'لا توجد مشتريات حتى الآن.'}</p>}
    </section>
    {pages > 1 && createPortal(<nav aria-label="صفحات المشتريات" className="purchase-pagination"><div><button type="button" className="btn-ghost" disabled={loading || page <= 1} onClick={() => setPage(current => current - 1)}><ChevronRight size={17} />السابق</button><span aria-current="page">{page} من {pages}</span><button type="button" className="btn-ghost" disabled={loading || page >= pages} onClick={() => setPage(current => current + 1)}>التالي<ChevronLeft size={17} /></button></div></nav>, document.body)}
    <PurchaseForm open={createOpen} accounts={accounts} baseCurrency={baseCurrency} onClose={() => setCreateOpen(false)} onSaved={(id) => { setCreateOpen(false); setNotice(`سُجّل الشراء #${id} على الحساب.`); setRevision((value) => value + 1); }} />
    <PurchaseDetails id={selectedId} admin={admin} baseCurrency={baseCurrency} accounts={accounts} onClose={() => setSelectedId(null)} onChanged={(message) => { if (message) setNotice(message); setRevision((value) => value + 1); }} />
  </div>;
}

function PurchaseStatus({ purchase }: { purchase: PurchaseDto }) { return <span className={"purchase-status " + (purchase.status === 'Completed' ? '' : 'purchase-cancelled')}>{purchase.status === 'Completed' ? 'فعّالة' : 'ملغاة'}</span>; }

function PurchaseForm({ open, purchase, accounts, baseCurrency, onClose, onSaved }: {
  open: boolean; purchase?: PurchaseDto | null; accounts: AccountIdentityOption[]; baseCurrency?: CurrencyDto;
  onClose: () => void; onSaved: (id: number) => void;
}) {
  const [accountId, setAccountId] = useState<number | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(businessToday);
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
    setConfirmOpen(false);
    setNotes(purchase?.notes ?? ''); setError('');
    setPurchaseDate(purchase?.purchase_date.slice(0,10) ?? businessToday());
  }, [open, purchase]);
  const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice || 0), 0);
  const selectedAccount = accounts.find((account) => account.account_id === accountId);
  const review = () => {
    if (!purchase && !accountId) { setError('اختر الحساب الذي ستسجل عليه المشتريات.'); return; }
    if (!purchaseDate || !Number.isFinite(total) || !items.length || items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 ||
      !/^\d+(?:\.\d{1,2})?$/.test(item.unitPrice) || Number(item.unitPrice) < 0) || total <= 0) {
      setError('أضف صنفًا على الأقل، وراجع الكميات وأسعار الشراء. يجب أن يكون الإجمالي أكبر من صفر.'); return;
    }
    setError(''); setConfirmOpen(true);
  };
  const save = async () => {
    if (saving || (!purchase && !accountId)) return;
    setSaving(true); setError('');
    try {
      const payload = { purchase_date: purchaseDate, items: items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: Number(item.unitPrice) })), notes: notes.trim() || undefined };
      if (purchase) {
        await purchasesService.update(purchase.customer_purchase_id, payload);
        setConfirmOpen(false); onSaved(purchase.customer_purchase_id);
      } else {
        const result = await purchasesService.createForAccount({ ...payload, account_id: accountId! });
        setConfirmOpen(false); onSaved(result.purchase_id);
      }
    } catch (reason) { setConfirmOpen(false); setError(apiMessages(reason, 'تعذر حفظ عملية الشراء.').join('، ')); }
    finally { setSaving(false); }
  };
  return <>
    <Modal open={open} onClose={saving ? () => undefined : onClose} className="purchase-editor" title={purchase ? `تعديل الشراء #${purchase.customer_purchase_id}` : 'إضافة شراء'} size="return" mobileFullscreen footer={<div className="purchase-form-footer" dir="rtl"><div><span className="text-xs text-stone-500">الإجمالي · {items.length} بند</span><b className="block text-xl text-brand" dir="ltr">{formatMoney(total, baseCurrency)}</b></div><button type="button" className="btn-primary" disabled={saving} onClick={review}>مراجعة وحفظ</button></div>}>
      <div className="space-y-3" dir="rtl">
        <div className="purchase-form-meta">{purchase ? <div className="rounded-xl bg-stone-50 p-3 text-sm">الحساب: <b className="text-brand">{purchaseName(purchase)}</b></div>
          : <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} label="الحساب العام" kinds={['General']} />}
        <RepDateInput label="تاريخ الشراء" value={purchaseDate} onChange={setPurchaseDate} disabled={saving} /></div>
        <p className="text-xs text-stone-500">تُسجل قيمة البضاعة على الحساب؛ الدفع بسند صرف مستقل.</p>
        {error && <div className="rep-error" role="alert">{error}</div>}
        <section className="purchase-add-products"><h3 className="font-bold text-brand">إضافة الأصناف</h3><ReturnVariantSelect emptyText="لا توجد منتجات مطابقة" disabled={saving} onChange={variant => setItems(rows => rows.some(row => row.product_variant_id === variant.product_variant_id) ? rows : [...rows, { product_variant_id: variant.product_variant_id, quantity: 1, stock: 0, unitPrice: '', label: [variant.products.name, variant.products.code, variant.colors.name, variant.size].join(' · ') }])} /></section>
        <h3 className="font-bold text-brand">بنود الشراء ({items.length})</h3>
        {items.length ? <div className="purchase-draft-items">{items.map((item) => <div key={item.product_variant_id} className="purchase-draft-row">
          <b className="self-center text-sm text-brand">{item.label}</b>
          <label><span className="rep-label">الكمية</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="numeric" min="1" step="1" value={item.quantity} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, quantity: Number(event.target.value) } : row))} /></label>
          <label><span className="rep-label">سعر الشراء</span><input className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" inputMode="decimal" min="0" step="0.01" value={item.unitPrice} onChange={(event) => setItems((rows) => rows.map((row) => row.product_variant_id === item.product_variant_id ? { ...row, unitPrice: event.target.value } : row))} /></label>
          <b className="pb-2 text-center text-brand" dir="ltr">{formatMoney(item.quantity * Number(item.unitPrice || 0), baseCurrency)}</b>
          <button type="button" className="btn-ghost text-sm font-bold text-red-700" onClick={() => setItems((rows) => rows.filter((row) => row.product_variant_id !== item.product_variant_id))}>إزالة</button>
        </div>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-stone-500">لم تُضف أصناف بعد.</p>}
        <label className="block"><span className="rep-label">ملاحظات (اختيارية)</span><textarea className="rep-control resize-none" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>

      </div>
    </Modal>
    <ConfirmDialog open={confirmOpen && open} onClose={() => setConfirmOpen(false)} onConfirm={() => void save()} loading={saving} severity="normal" title={purchase ? 'حفظ تعديل المشتريات' : 'اعتماد الشراء'} message={`سيُسجل الشراء على حساب ${purchase ? purchaseName(purchase) : selectedAccount?.name ?? '—'}، مع تحديث المخزون والدفتر المالي.`} confirmLabel={purchase ? 'حفظ التعديلات' : 'تسجيل الشراء'} details={<div className="flex justify-between gap-2"><span>{items.length} أصناف</span><b>{formatMoney(total, baseCurrency)}</b></div>} />
  </>;
}

function PurchaseDetails({ id, admin, baseCurrency, accounts, onClose, onChanged }: {
  id: number | null; admin: boolean; baseCurrency?: CurrencyDto; accounts: AccountIdentityOption[];
  onClose: () => void; onChanged: (message?: string) => void;
}) {
  const [purchase, setPurchase] = useState<PurchaseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (id === null) return;
    setLoading(true); setError('');
    try { const result = await purchasesService.getById(id, signal); if (!signal?.aborted) setPurchase(result); }
    catch (reason) { if (!signal?.aborted) setError(apiMessages(reason, 'تعذر تحميل تفاصيل الشراء.').join('، ')); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [id]);
  useEffect(() => { const controller = new AbortController(); setPurchase(null); setEditing(false); setCancelOpen(false); setRestoreOpen(false); setDeleteOpen(false); void load(controller.signal); return () => controller.abort(); }, [load]);
  const cancel = async () => {
    if (!purchase || saving) return;
    setSaving(true); setError('');
    try { await purchasesService.cancel(purchase.customer_purchase_id); setCancelOpen(false); await load(); onChanged(); }
    catch (reason) { setCancelOpen(false); setError(apiMessages(reason, 'تعذر إلغاء الشراء.').join('، ')); }
    finally { setSaving(false); }
  };
  const recoverOrDelete = async (action: 'restore' | 'delete') => {
    if (!purchase || saving) return;
    setSaving(true); setError('');
    try {
      const result = action === 'restore'
        ? await purchasesService.restore(purchase.customer_purchase_id)
        : await purchasesService.permanentDelete(purchase.customer_purchase_id);
      setRestoreOpen(false); setDeleteOpen(false);
      if (action === 'delete') { setPurchase(null); onClose(); }
      else await load();
      onChanged(result.message);
    } catch (reason) {
      setRestoreOpen(false); setDeleteOpen(false);
      setError(apiMessages(reason, action === 'restore' ? 'تعذر استعادة الشراء.' : 'تعذر حذف الشراء.').join('، '));
    } finally { setSaving(false); }
  };
  return <>
    <Modal open={id !== null} onClose={saving ? () => undefined : onClose} title={id === null ? 'تفاصيل الشراء' : `تفاصيل الشراء #${id}`} size="return" mobileFullscreen className="purchase-details" footer={purchase && !loading ? <div dir="rtl" className="purchase-form-footer"><span className="font-bold text-brand">إجمالي الشراء</span><b className="text-xl text-brand" dir="ltr">{formatMoney(purchase.total_amount, baseCurrency)}</b></div> : undefined}>
      <div className="space-y-3" dir="rtl">
        {error && <div className="rep-error" role="alert">{error}</div>}
        {loading && <p className="text-sm text-stone-500">جارٍ تحميل التفاصيل…</p>}
        {purchase && !loading && <>
          <div className="purchase-detail-identity"><h2 className="text-xl font-black text-brand">شراء #{purchase.customer_purchase_id}</h2><PurchaseStatus purchase={purchase} /><span className="text-sm text-stone-500">{dateText(purchase.purchase_date)}</span></div>
          <dl className="grid gap-3 rounded-xl bg-stone-50 p-3 text-sm sm:grid-cols-2"><Detail label="الحساب العام" value={purchaseName(purchase)} /><Detail label="تاريخ الشراء" value={dateText(purchase.purchase_date)} /><Detail label="الأصناف" value={String(purchase.customer_purchase_items.length)} /><Detail label="قيمة الشراء" value={formatMoney(purchase.total_amount, baseCurrency)} />{purchase.cancelled_at && <Detail label="تاريخ الإلغاء" value={dateText(purchase.cancelled_at)} />}</dl>
          <div className="purchase-main-actions">{admin && purchase.status === 'Cancelled' && <button type="button" className="btn-primary" disabled={saving} onClick={() => setRestoreOpen(true)}><RotateCcw size={17} />استعادة الشراء</button>}{admin && purchase.status === 'Completed' && <button type="button" className="btn-primary" onClick={() => setEditing(true)}><Pencil size={17} />تعديل</button>}<Link className="btn-outline" to={`/${admin?'owner':'rep'}/accounts/${purchase.account_id}`}>تفاصيل الحساب والكشف</Link></div>
          {purchase.notes?.trim() ? <div className="rounded-lg bg-stone-50 p-3 text-sm"><span className="rep-label">ملاحظات</span><p className="whitespace-pre-wrap break-words">{purchase.notes}</p></div> : <p className="text-xs text-stone-400">لا توجد ملاحظات</p>}
          <section><h3 className="mb-2 font-bold text-brand">الأصناف ({purchase.customer_purchase_items.length})</h3><div className="purchase-detail-items">{purchase.customer_purchase_items.map(item => <div key={item.customer_purchase_item_id} className="purchase-detail-item"><b>{itemName(item)}</b><span><small>الكمية</small>{item.quantity}</span><span><small>سعر الشراء</small>{formatMoney(item.unit_price, baseCurrency)}</span><b><small>قيمة البند</small>{formatMoney(item.quantity * Number(item.unit_price), baseCurrency)}</b></div>)}</div></section>
          {admin && purchase.status === 'Completed' && <div className="purchase-danger-actions"><button type="button" className="btn-outline text-red-700" onClick={() => setCancelOpen(true)}><Ban size={17} />إلغاء الشراء</button></div>}
          {admin && purchase.status === 'Cancelled' && <div className="purchase-danger-actions"><button type="button" className="btn-outline text-red-700" disabled={saving} onClick={() => setDeleteOpen(true)}><Trash2 size={17} />حذف نهائي</button></div>}

        </>}
      </div>
    </Modal>
    <PurchaseForm open={editing} purchase={purchase} accounts={accounts} baseCurrency={baseCurrency} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void load(); onChanged(); }} />
    <ConfirmDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} onConfirm={() => void recoverOrDelete('restore')} loading={saving} severity="normal" title="استعادة الشراء" message="سيُستعاد المخزون والقيد المالي للشراء بنفس الكميات والأسعار وتاريخ الشراء الأصلي." confirmLabel="تأكيد الاستعادة" />
    <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => void recoverOrDelete('delete')} loading={saving} title="حذف الشراء نهائيًا" message="سيُحذف مستند الشراء الملغى وبنوده نهائيًا مع الاحتفاظ بسجل الآثار والتدقيق. لا يمكن التراجع عن الحذف." confirmLabel="حذف نهائي" details={purchase && <div className="flex justify-between gap-2"><span>شراء #{purchase.customer_purchase_id} · {purchaseName(purchase)}</span><b>{formatMoney(purchase.total_amount, baseCurrency)}</b></div>} />
    <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={() => void cancel()} loading={saving} title="إلغاء الشراء" message="ستُعكس حركة المخزون والقيد المالي. يجب إلغاء مردودات الشراء المرتبطة الفعّالة أولًا. سند الصرف مستقل عن مستند الشراء." confirmLabel="تأكيد الإلغاء" details={purchase && <div className="flex justify-between gap-2"><span>{purchaseName(purchase)}</span><b>{formatMoney(purchase.total_amount, baseCurrency)}</b></div>} />
  </>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-stone-500">{label}</dt><dd className="font-bold text-brand">{value}</dd></div>;
}
