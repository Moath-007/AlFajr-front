import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  accountsService,
  citiesService,
  type CityResponseDto,
  type AccountIdentity,
  type AccountIdentityInput,
  type AccountStatementEntry,
  type AccountMovementType,
  type UserAccountKind,
} from '@/api';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { RepSelect } from '@/components/rep/RepFormControls';
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from '@/components/rep/repOrderUtils';
import {
  accountKindLabels,
  accountAmountColor,

  movementLabels,
} from './accountUiUtils';
import { AccountFinancialFields } from './AccountFinancialFields';
import { optionalOpeningBalance, type OpeningBalanceDraft } from './openingBalanceInput';
import { businessToday, financialDirectionLabels } from './accountUiUtils';

export function Balance({
  value,
  kind,
}: {
  value: string;
  kind: UserAccountKind;
}) {
  return (
    <div>
      <strong className={'block text-3xl font-bold ' + accountAmountColor(value, 'balance', kind)} dir="ltr">
        {(Number(value) > 0 ? '+' : Number(value) < 0 ? '-' : '') + formatMoney(Math.abs(Number(value)))}
      </strong>
    </div>
  );
}
export function Pager({
  floating = false,
  page,
  pages,
  total,
  onPage,
}: {
  floating?: boolean;
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (floating) return <div className="flex flex-col items-center gap-2 pt-1">
    <nav aria-label="صفحات النتائج" className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
      <button className="btn-ghost min-h-11" disabled={page <= 1} onClick={()=>onPage(page-1)}>السابق</button>
      <span className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold tabular-nums text-brand" aria-current="page">{page} من {Math.max(1,pages)}</span>
      <button className="btn-ghost min-h-11" disabled={page >= pages} onClick={()=>onPage(page+1)}>التالي</button>
    </nav><span className="text-xs text-stone-500">{total} نتيجة</span>
  </div>;
  return (
    <nav
      aria-label="صفحات النتائج"
      className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
    >
      <span>
        {total} نتيجة · الصفحة {page} من {Math.max(1, pages)}
      </span>
      <div className="flex gap-2">
        <button
          className="btn-outline"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          السابق
        </button>
        <button
          className="btn-outline"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          التالي
        </button>
      </div>
    </nav>
  );
}
export function AccountIdentityEditor({
  account,
  admin,
  onClose,
  onSaved,
}: {
  account: AccountIdentity | null;
  admin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AccountIdentityInput>({
    kind: account?.kind ?? 'General',
    name: account?.name ?? '',
    phone: account?.phone ?? '',
    city_id: account?.city_id ?? undefined,
    notes: account?.notes ?? '',
  });
  const [openingEnabled, setOpeningEnabled] = useState(false);
  const [opening, setOpening] = useState<OpeningBalanceDraft>(() => ({ amount: '', direction: 'Debit', business_date: businessToday(), notes: '' }));
  const [pendingCreate, setPendingCreate] = useState<AccountIdentityInput | null>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cities, setCities] = useState<CityResponseDto[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');
  const [cityRevision, setCityRevision] = useState(0);
  useEffect(() => {
    if (form.kind !== 'General') return;
    const controller = new AbortController();
    setCitiesLoading(true); setCitiesLoaded(false); setCitiesError('');
    citiesService.list(controller.signal).then(items => {
      if (!controller.signal.aborted) { setCities(items); setCitiesLoaded(true); }
    }).catch(e => {
      if (!controller.signal.aborted) setCitiesError(apiMessages(e, 'تعذر تحميل المدن.').join('، '));
    }).finally(() => { if (!controller.signal.aborted) setCitiesLoading(false); });
    return () => controller.abort();
  }, [form.kind, cityRevision]);
  async function createCity(name: string) {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    try {
      const created = await citiesService.create({ name: trimmedName });
      setCities(current => current.some(city => city.city_id === created.city_id) ? current : [...current, created]);
      setCitiesLoaded(true); setCitiesError('');
      // Refresh authoritative options after creation, preserving the new selection.
      setCityRevision(value => value + 1);
      return String(created.city_id);
    } catch (e) {
      try {
        const refreshed = await citiesService.list();
        setCities(refreshed); setCitiesLoaded(true); setCitiesError('');
        const existing = refreshed.find(city => city.name === trimmedName);
        if (existing) return String(existing.city_id);
      } catch { /* Keep the original creation error. */ }
      throw new Error(apiMessages(e, 'تعذر إضافة المدينة.').join('، '));
    }
  }
  async function save(input?: AccountIdentityInput) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const identity = {
        name: form.name,
        notes: form.notes || null,
        ...(form.kind === 'General' ? { phone: form.phone || null, city_id: form.city_id } : {}),
      };
      if (account) await accountsService.edit(account.account_id, identity);
      else await accountsService.create(input ?? { ...identity, kind: form.kind });
      onSaved();
      onClose();
    } catch (e) {
      setError(apiMessages(e).join('، '));
      setPendingCreate(null);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function submit() {
    if (busy || submitting.current) return;
    setError('');
    if (form.kind === 'General') {
      if (!citiesLoaded) { setError('انتظر تحميل المدن أو أعد المحاولة.'); return; }
      if (!form.city_id || !cities.some(city => city.city_id === form.city_id)) {
        setError('اختر مدينة للحساب العام.'); return;
      }
    }
    if (account) { void save(); return; }
    try {
      const opening_balance = optionalOpeningBalance(admin && openingEnabled, opening);
      const input: AccountIdentityInput = { kind: form.kind, name: form.name, notes: form.notes || null,
        ...(form.kind === 'General' ? { phone: form.phone || null, city_id: form.city_id } : {}),
        ...(opening_balance !== undefined ? { opening_balance } : {}),
      };
      if (opening_balance !== undefined) setPendingCreate(input);
      else void save(input);
    } catch (e) { setError(e instanceof Error ? e.message : 'راجع بيانات الرصيد الافتتاحي.'); }
  }
  return (
    <>
    <Modal
      open
      title={account ? 'تعديل بيانات الحساب' : 'حساب جديد'}
      onClose={busy ? () => undefined : onClose}
      size="sm"
    >
      <form
        dir="rtl"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <fieldset disabled={busy} className="min-w-0 space-y-4">
        {account ? (
          <p className="text-stone-500">
            {account.account_number} · {accountKindLabels[account.kind]}
          </p>
        ) : admin ? (
          <RepSelect label="نوع الحساب" disabled={busy} value={form.kind} onChange={(kind:UserAccountKind)=>setForm({...form,kind})} options={(Object.entries(accountKindLabels) as [UserAccountKind,string][]).map(([value,label])=>({value,label}))} />
        ) : null}
        <label className="block">
          <span className="rep-label">الاسم <span aria-hidden="true">*</span></span>
          <input
            required
            autoFocus
            className="rep-control"
            placeholder="اسم الحساب"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        {form.kind === 'General' && (
          <label className="block">
            <span className="rep-label">الهاتف <span className="text-stone-400">(اختياري)</span></span>
            <input
              dir="ltr"
              type="tel"
              placeholder="رقم الهاتف"
              className="rep-control"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
        )}
        {form.kind === 'General' && <div className="space-y-2">
          <Select label="المدينة *" searchable value={form.city_id ? String(form.city_id) : ''}
            onChange={value => setForm(current => ({ ...current, city_id: value ? Number(value) : undefined }))}
            onCreate={admin ? createCity : undefined} loading={citiesLoading}
            placeholder="اختر المدينة" searchPlaceholder={admin ? 'ابحث عن مدينة أو أضف مدينة جديدة' : 'ابحث عن مدينة'}
            emptyText="لا توجد مدن مطابقة" options={cities.map(city => ({ value: String(city.city_id), label: city.name }))} />
          {citiesError && <p className="rep-error" role="alert">{citiesError}</p>}
          {citiesError && <button type="button" className="btn-ghost" onClick={() => setCityRevision(value => value + 1)}>إعادة تحميل المدن</button>}
        </div>}
        <label className="block">
          <span className="rep-label">ملاحظات <span className="text-stone-400">(اختياري)</span></span>
          <textarea
            className="rep-control"
            placeholder="ملاحظات إضافية"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        {!account && admin && <section className="space-y-3 rounded-xl border border-stone-200 p-3">
          <label className="flex items-center gap-2 font-bold text-brand">
            <input type="checkbox" checked={openingEnabled} onChange={e => setOpeningEnabled(e.target.checked)} />
            إضافة رصيد افتتاحي (اختياري)
          </label>
          {openingEnabled && <AccountFinancialFields kind="Opening" amount={opening.amount} direction={opening.direction}
            date={opening.business_date} notes={opening.notes} busy={busy}
            onAmount={amount => setOpening(current => ({ ...current, amount }))}
            onDirection={direction => setOpening(current => ({ ...current, direction: direction as OpeningBalanceDraft['direction'] }))}
            onDate={business_date => setOpening(current => ({ ...current, business_date }))}
            onNotes={notes => setOpening(current => ({ ...current, notes }))} />}
        </section>}
        </fieldset>
        {error && (
          <p role="alert" className="rep-error">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-4"><button type="submit" className="btn-primary min-h-11" disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : !account && admin && openingEnabled ? 'مراجعة وحفظ' : 'حفظ'}
        </button>
        <button type="button" className="btn-outline min-h-11" disabled={busy} onClick={onClose}>إلغاء</button></div>
      </form>
    </Modal>
    <FinancialConfirmation
      action={pendingCreate?.opening_balance ? `إنشاء الحساب ${pendingCreate.name} وتسجيل الرصيد الافتتاحي بقيمة ${formatMoney(pendingCreate.opening_balance.amount)}، ${financialDirectionLabels[pendingCreate.opening_balance.direction]} بتاريخ ${formatOrderDate(pendingCreate.opening_balance.business_date)}؟` : null}
      busy={busy} onClose={() => { if (!busy) setPendingCreate(null); }}
      onConfirm={() => { if (pendingCreate) void save(pendingCreate); }} />
    </>
  );
}
export function FinancialConfirmation({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: string | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={!!action}
      title="تأكيد العملية المالية"
      message={action ?? ''}
      severity="normal"
      loading={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function MovementDescription({
  entry: e,
  base,
  admin,
}: {
  entry: AccountStatementEntry;
  base: string;
  admin: boolean;
}) {
  let href: string | null = null;
  if (e.source) {
    const source = e.source;
    if (source.kind === 'Invoice') href = `${base}/orders/${source.id}`;
    else if (source.kind === 'Purchase')
      href = `${base}/purchases?purchase=${source.id}`;
    else if (source.kind === 'SalesReturn')
      href = `${base}/returns?return=${source.id}`;
    else if (source.kind === 'Check' && admin)
      href = `${base}/checks/${source.id}`;
    else if (['Payment', 'Discount', 'PurchaseReturn'].includes(source.kind))
      href = `${base}/account-sources/${source.kind}/${source.id}`;
  }
  const check = e.source_details?.check;
  const checkNumber =
    check &&
    typeof check === 'object' &&
    'number' in check &&
    typeof check.number === 'string'
      ? check.number
      : null;
  return (
    <>
      <b>
        {movementLabels[e.category as AccountMovementType] ?? e.type}
        {e.category === 'Other' ? ' · ' + e.type : ''}
      </b>
      {e.source && (
        <p className="mt-1 text-xs text-stone-500">
          #{e.source.id}{' '}
          {href && (
            <Link
              to={href}
              target="_blank"
              rel="noopener noreferrer"
              data-print-ignore
              className="text-brand underline"
            >
              عرض التفاصيل ↗
            </Link>
          )}
        </p>
      )}
      {checkNumber && (
        <p className="mt-1 text-xs text-stone-500">شيك #{checkNumber}</p>
      )}
      {e.notes && (
        <p className="mt-1 max-w-xs whitespace-pre-wrap text-xs text-stone-500">
          {e.notes}
        </p>
      )}
    </>
  );
}
export function MovementTable({
  entries,
  kind,
  base,
  admin,
}: {
  entries: AccountStatementEntry[];
  kind: UserAccountKind;
  base: string;
  admin: boolean;
}) {
  return (
    <>
      <div className="report-mobile-cards space-y-3 md:hidden print:hidden">
        {entries.map((e) => (
          <section
            key={e.movement_id}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <MovementDescription entry={e} base={base} admin={admin} />
              </div>
              <time className="whitespace-nowrap text-xs text-stone-500">
                {formatOrderDate(e.date)}
              </time>
            </header>
            <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              {[
                ['مدين', e.debit],
                ['دائن', e.credit],
                ['الرصيد بعد الحركة', e.balance_after],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-stone-500">{label}</dt>
                  <dd dir="rtl" className={'mt-1 text-right font-semibold ' + accountAmountColor(value, label === 'مدين' ? 'debit' : label === 'دائن' ? 'credit' : 'balance', kind)}>
                    {label === 'الرصيد بعد الحركة' ? <MovementBalance value={value} kind={kind} /> : <bdi>{formatMoney(value)}</bdi>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {!entries.length && (
          <p className="rounded-xl border p-6 text-center text-stone-500">
            لا توجد حركات ضمن الفترة والفلاتر المحددة.
          </p>
        )}
      </div>
      <div className="report-desktop-table hidden overflow-x-auto rounded-xl border border-stone-200 md:block">
        <table className="w-full min-w-[680px] text-right text-sm">
          <thead className="bg-stone-50">
            <tr>
              {[
                'التاريخ',
                'الحركة / رقم المستند',
                'مدين',
                'دائن',
                'الرصيد بعد الحركة',
              ].map((label) => (
                <th key={label} className="px-3 py-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.movement_id}
                className="border-t border-stone-100 align-top"
              >
                <td className="px-3 py-3 whitespace-nowrap">
                  {formatOrderDate(e.date)}
                </td>
                <td className="px-3 py-3">
                  <MovementDescription entry={e} base={base} admin={admin} />
                </td>
                {[e.debit, e.credit, e.balance_after].map(
                  (value, index) => (
                    <td
                      key={index}
                      className={'px-3 py-3 whitespace-nowrap ' + accountAmountColor(value, index === 0 ? 'debit' : index === 1 ? 'credit' : 'balance', kind)}
                      dir="rtl"
                    >
                      {index === 2 ? <MovementBalance value={value} kind={kind} /> : <bdi>{formatMoney(value)}</bdi>}
                    </td>
                  ),
                )}
              </tr>
            ))}
            {!entries.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  لا توجد حركات ضمن الفترة والفلاتر المحددة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MovementBalance({ value, kind }: { value: string; kind: UserAccountKind }) {
  const amount = Number(value);
  return <div className={accountAmountColor(value, 'balance', kind)}>
    <bdi dir="ltr" className="block font-semibold">{(amount > 0 ? '+' : amount < 0 ? '-' : '') + formatMoney(Math.abs(amount))}</bdi>
  </div>;
}
