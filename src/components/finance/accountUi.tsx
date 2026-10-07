import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  accountsService,
  type AccountIdentity,
  type AccountIdentityInput,
  type AccountStatementEntry,
  type AccountMovementType,
  type UserAccountKind,
} from '@/api';
import Modal from '@/components/ui/Modal';
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
export function Balance({
  value,
}: {
  value: string;
  kind: UserAccountKind;
}) {
  return (
    <div>
      <strong className={'block text-3xl font-bold ' + accountAmountColor(value)} dir="ltr">
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
    notes: account?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      const identity = {
        name: form.name,
        notes: form.notes || null,
        ...(form.kind === 'General' ? { phone: form.phone || null } : {}),
      };
      if (account) await accountsService.edit(account.account_id, identity);
      else await accountsService.create({ ...identity, kind: form.kind });
      onSaved();
      onClose();
    } catch (e) {
      setError(apiMessages(e).join('، '));
    } finally {
      setBusy(false);
    }
  }
  return (
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
          void save();
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
        </fieldset>
        {error && (
          <p role="alert" className="rep-error">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-4"><button type="submit" className="btn-primary min-h-11" disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button type="button" className="btn-outline min-h-11" disabled={busy} onClick={onClose}>إلغاء</button></div>
      </form>
    </Modal>
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
  base,
  admin,
}: {
  entries: AccountStatementEntry[];
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
                  <dd dir="rtl" className={'mt-1 text-right font-semibold ' + accountAmountColor(value, label === 'مدين' ? 'debit' : label === 'دائن' ? 'credit' : 'balance')}>
                    {label === 'الرصيد بعد الحركة' ? <MovementBalance value={value} /> : <bdi>{formatMoney(value)}</bdi>}
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
                      className={'px-3 py-3 whitespace-nowrap ' + accountAmountColor(value, index === 0 ? 'debit' : index === 1 ? 'credit' : 'balance')}
                      dir="rtl"
                    >
                      {index === 2 ? <MovementBalance value={value} /> : <bdi>{formatMoney(value)}</bdi>}
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

function MovementBalance({ value }: { value: string }) {
  const amount = Number(value);
  return <div className={accountAmountColor(value)}>
    <bdi dir="ltr" className="block font-semibold">{(amount > 0 ? '+' : amount < 0 ? '-' : '') + formatMoney(Math.abs(amount))}</bdi>
  </div>;
}
