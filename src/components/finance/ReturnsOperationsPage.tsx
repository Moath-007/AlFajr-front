import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { returnsService, type CustomerReturnDto, type ReturnType } from '@/api';
import { useAuth } from '@/auth';
import AccountReturnLauncher from './AccountReturnLauncher';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { RepSelect } from '@/components/rep/RepFormControls';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';
import { formatMoney } from '@/utils/money';

type StatusFilter = 'all' | 'active' | 'cancelled';
type TypeFilter = 'all' | ReturnType;
const returnTypeLabel = (type: ReturnType) => type === 'SalesReturn' ? 'مردود بيع' : 'مردود شراء';
const returnSource = (row: CustomerReturnDto) => row.order_id ? `طلب #${row.order_id}` : row.customer_purchase_id ? `مشتريات #${row.customer_purchase_id}` : 'مردود مباشر';
const partyName = (row: CustomerReturnDto) => row.account?.name ?? row.orders?.sale_account?.name ?? row.customers?.name ?? 'الحساب غير متاح';
const dateText = (value: string) => new Date(value).toLocaleDateString('ar-EG-u-nu-latn', { day: '2-digit', month: '2-digit', year: 'numeric' });
const itemName = (item: CustomerReturnDto['items'][number]) => item.product_variants?.products?.name ?? item.product_variants?.products?.product_name ?? `صنف #${item.product_variant_id}`;

export default function ReturnsOperationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CustomerReturnDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [selected, setSelected] = useState<CustomerReturnDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CustomerReturnDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await returnsService.list());
    } catch (reason) {
      setError(apiMessages(reason, 'تعذر تحميل المردودات.').join('، '));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((row) => {
      if (typeFilter !== 'all' && row.return_type !== typeFilter) return false;
      if (statusFilter === 'active' && row.cancelled_at) return false;
      if (statusFilter === 'cancelled' && !row.cancelled_at) return false;
      if (!query) return true;
      return [row.customer_return_id, partyName(row), returnSource(row), row.notes, ...row.items.map(itemName)]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
    });
  }, [items, search, typeFilter, statusFilter]);
  const active = items.filter((row) => !row.cancelled_at);
  const salesTotal = active.filter((row) => row.return_type === 'SalesReturn').reduce((sum, row) => sum + Number(row.total_amount), 0);
  const purchasesTotal = active.filter((row) => row.return_type === 'PurchaseReturn').reduce((sum, row) => sum + Number(row.total_amount), 0);
  const visible = filtered.slice(0, visibleCount);
  const basePath = user?.role === 'Admin' ? '/owner' : '/rep';

  const cancel = async () => {
    if (!cancelTarget || saving) return;
    const id = cancelTarget.customer_return_id;
    setSaving(true);
    setError('');
    try {
      await returnsService.cancel(id);
      setCancelTarget(null);
      setSelected(null);
      setNotice(`أُلغي المردود #${id} وعُكس أثره المالي والمخزني.`);
      await load();
    } catch (reason) {
      setError(apiMessages(reason, 'تعذر إلغاء المردود.').join('، '));
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div><p className="text-xs font-black text-gold-dark">المبيعات والمشتريات</p><h1 className="text-3xl font-black text-brand">المردودات</h1><p className="text-sm text-stone-500">راجع الأصناف والمبالغ ومرجع كل مردود، وتابع حالته من مكان واحد.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" onClick={() => void load()} disabled={loading}>تحديث</button>{user?.role === 'Admin' && <button type="button" className="btn-primary" onClick={() => setLauncherOpen(true)}>إنشاء مردود</button>}</div>
    </header>


    {error && <div className="rep-error" role="alert">{error} <button type="button" className="mr-2 underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}

    <section className="grid gap-2 sm:grid-cols-3" aria-label="ملخص المردودات">
      <Summary label="مردودات فعّالة" value={String(active.length)} />
      <Summary label="مردودات البيع" value={formatMoney(salesTotal)} />
      <Summary label="مردودات الشراء" value={formatMoney(purchasesTotal)} />
    </section>

    <section className="rounded-2xl border bg-white">
      <div className="space-y-3 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-brand">سجل المردودات <span className="text-sm font-normal text-stone-500">({filtered.length})</span></h2>{user?.role === 'Admin' && <Link className="text-sm font-bold text-gold-dark underline" to="/owner/reports/returns">تقرير المردودات</Link>}</div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_170px]">
          <label className="block"><span className="sr-only">البحث في المردودات</span><input className="rep-control" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(30); }} placeholder="ابحث برقم المردود أو الجهة أو الصنف" /></label>
          <RepSelect value={typeFilter} onChange={(value) => { setTypeFilter(value); setVisibleCount(30); }} options={[{ value: 'all', label: 'كل الأنواع' }, { value: 'SalesReturn', label: 'مردود بيع' }, { value: 'PurchaseReturn', label: 'مردود شراء' }]} />
          <RepSelect value={statusFilter} onChange={(value) => { setStatusFilter(value); setVisibleCount(30); }} options={[{ value: 'all', label: 'كل الحالات' }, { value: 'active', label: 'فعّال' }, { value: 'cancelled', label: 'ملغى' }]} />
        </div>
      </div>
      {loading ? <p className="p-6 text-sm text-stone-500">جارٍ تحميل المردودات…</p> : visible.length ? <div className="divide-y">
        {visible.map((row) => <article key={row.customer_return_id} className="grid gap-2 p-4 text-sm hover:bg-stone-50 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="text-brand">مردود #{row.customer_return_id}</b><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.cancelled_at ? 'bg-stone-100 text-stone-600' : 'bg-emerald-50 text-emerald-800'}`}>{row.cancelled_at ? 'ملغى' : 'فعّال'}</span><span className="text-stone-500">{returnTypeLabel(row.return_type)}</span></div><p className="mt-1 text-stone-600">{partyName(row)}</p></div>
          <div className="text-stone-600"><p>{returnSource(row)}</p><p className="text-xs">{dateText(row.created_at)} · {row.items.length} {row.items.length === 1 ? 'صنف' : 'أصناف'}</p></div>
          <b className="whitespace-nowrap text-brand" dir="ltr">{formatMoney(row.total_amount)}</b>
          <button type="button" className="btn-outline text-sm" onClick={() => setSelected(row)}>التفاصيل</button>
        </article>)}
      </div> : <p className="p-8 text-center text-sm text-stone-500">{items.length ? 'لا توجد مردودات مطابقة للبحث.' : 'لا توجد مردودات حتى الآن.'}</p>}
      {!loading && filtered.length > visibleCount && <div className="border-t p-3 text-center"><button type="button" className="btn-outline" onClick={() => setVisibleCount((count) => count + 30)}>عرض المزيد</button></div>}
    </section>

    <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `تفاصيل المردود #${selected.customer_return_id}` : 'تفاصيل المردود'} size="lg" mobileFullscreen>
      {selected && <div className="space-y-4" dir="rtl">
        <div className="flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-brand-50 px-3 py-1 font-bold text-brand">{returnTypeLabel(selected.return_type)}</span><span className={`rounded-full px-3 py-1 font-bold ${selected.cancelled_at ? 'bg-stone-100 text-stone-600' : 'bg-emerald-50 text-emerald-800'}`}>{selected.cancelled_at ? 'ملغى' : 'فعّال'}</span></div>
        <dl className="grid gap-2 rounded-xl bg-stone-50 p-3 text-sm sm:grid-cols-2"><Detail label="الجهة / الحساب" value={partyName(selected)} /><Detail label="تاريخ التسجيل" value={dateText(selected.created_at)} /><Detail label="المصدر" value={returnSource(selected)} /><Detail label="عدد الأصناف" value={String(selected.items.length)} />{selected.cancelled_at && <Detail label="تاريخ الإلغاء" value={dateText(selected.cancelled_at)} />}</dl>
        <div><h3 className="mb-2 font-black text-brand">الأصناف</h3><div className="overflow-hidden rounded-xl border"><div className="divide-y">{selected.items.map((item, index) => <div key={item.customer_return_item_id ?? index} className="grid gap-1 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"><span className="font-bold text-brand">{itemName(item)}{item.product_variants?.size && <small className="block font-normal text-stone-500">المقاس: {item.product_variants.size}</small>}</span><span className="text-stone-600">الكمية: {item.quantity}</span><span className="text-stone-600">السعر: {formatMoney(item.unit_price)}</span><b dir="ltr">{formatMoney(Number(item.unit_price ?? 0) * item.quantity)}</b></div>)}</div></div></div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 p-3"><span className="font-bold text-brand">إجمالي المردود</span><b className="text-xl text-brand" dir="ltr">{formatMoney(selected.total_amount)}</b></div>
        {selected.notes && <div className="rounded-xl border p-3 text-sm"><b className="text-brand">ملاحظات</b><p className="mt-1 whitespace-pre-wrap text-stone-600">{selected.notes}</p></div>}
        <div className="flex flex-wrap gap-2 border-t pt-3">{selected.account_id && user?.role === 'Admin' && <Link className="btn-outline" to={`/owner/accounts/${selected.account_id}`}>كشف الحساب</Link>}{selected.order_id && <Link className="btn-outline" to={`${basePath}/orders/${selected.order_id}`}>فتح الطلب الأصلي</Link>}{selected.customer_purchase_id && user?.role === 'Admin' && <Link className="btn-outline" to="/owner/customer-purchases">فتح المشتريات</Link>}{user?.role === 'Admin' && !selected.cancelled_at && <button type="button" className="btn-outline text-red-700" onClick={() => setCancelTarget(selected)}>إلغاء المردود</button>}</div>
      </div>}
    </Modal>
    <ConfirmDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={() => void cancel()} loading={saving} title={cancelTarget ? `إلغاء المردود #${cancelTarget.customer_return_id}` : 'إلغاء المردود'} message="سيُلغى المردود وتُعكس حركاته المالية والمخزنية. راجع المبلغ والأصناف قبل التأكيد." confirmLabel="تأكيد إلغاء المردود" details={cancelTarget && <div className="flex justify-between gap-2"><span>{returnTypeLabel(cancelTarget.return_type)} · {cancelTarget.items.length} أصناف</span><b>{formatMoney(cancelTarget.total_amount)}</b></div>} />
    <AccountReturnLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} onSaved={(id) => { setLauncherOpen(false); setNotice(`سُجل المردود #${id} على الحساب.`); void load(); }} />
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-white p-3"><p className="text-sm text-stone-600">{label}</p><b className="mt-1 block text-xl text-brand">{value}</b></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-stone-500">{label}</dt><dd className="font-bold text-brand">{value}</dd></div>;
}
