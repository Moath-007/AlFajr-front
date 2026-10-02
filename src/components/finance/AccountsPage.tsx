import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { accountsService, companyProfileService, ledgerService, type AccountKind, type AccountStatement, type CompanyProfileDataDto, type LedgerAccount } from '@/api';
import { ApiError } from '@/api/errors';
import { apiMessages, formatOrderDate } from '@/components/rep/repOrderUtils';
import { RepDateInput, RepSelect } from '@/components/rep/RepFormControls';
import PrintHeader from '@/components/printing/PrintHeader';
import AccountPicker from './AccountPicker';
import StatementSourceDetailsView, { StatementCounterparts, statementMovementName } from './StatementSourceDetails';
import { isInternalAccount } from './accountLabels';
import { formatMoney } from '@/utils/money';
import { printA4Element } from '@/utils/printDocument';

const balanceLabel = (value: string) => Number(value) > 0 ? 'مدين' : Number(value) < 0 ? 'دائن' : 'متوازن';
type CreatableAccountKind = 'General' | 'Bank' | 'Cash';
const accountKindOptions: Array<{ value: CreatableAccountKind; label: string }> = [
  { value: 'General', label: 'حساب عام' },
  { value: 'Bank', label: 'حساب بنكي' },
  { value: 'Cash', label: 'صندوق نقدي' },
];

const kindLabels: Record<AccountKind, string> = {
  General: 'حساب عام', Party: 'حساب عام', Bank: 'حساب بنكي', Cash: 'صندوق نقدي',
  CheckHolding: 'حساب عام', Clearing: 'حساب عام', OnlineSales: 'حساب عام',
  StoreSales: 'حساب عام', Returns: 'حساب عام', Revenue: 'حساب عام',
  PurchaseOffset: 'حساب عام', Equity: 'حساب عام', DebtOffset: 'حساب عام', Expense: 'حساب عام',
};
const accountTypeLabel = (account: LedgerAccount) => isInternalAccount(account) ? 'حساب نظام' : kindLabels[account.kind] ?? account.kind;
function AccountList({ rows, onEdit, onDelete }: { rows: LedgerAccount[]; onEdit: (account: LedgerAccount) => void; onDelete: (account: LedgerAccount) => void }) {
  return <>
    <div className="grid gap-2 lg:hidden">{rows.map((account) => <article key={account.account_id} className="rounded-xl border bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-black text-brand">{account.customer_name ?? account.name}</h3><p className="text-xs text-stone-500">رقم الحساب: {account.code} · {accountTypeLabel(account)}</p></div><div className="shrink-0 text-left"><p className="font-black text-brand">{formatMoney(Math.abs(Number(account.balance)))}</p><p className="text-xs text-stone-500">{balanceLabel(account.balance)}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Link className="btn-outline flex-1 text-center text-sm" to={'/owner/accounts/' + account.account_id}>كشف حساب</Link>{!isInternalAccount(account) && <><Link className="btn-primary flex-1 text-center text-sm" to={'/owner/vouchers?account=' + account.account_id}>سند</Link><button className="btn-outline flex-1" onClick={() => onEdit(account)}>تعديل</button><button className="btn-outline flex-1 text-red-700" onClick={() => onDelete(account)}>حذف</button></>}</div></article>)}</div>
    <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm lg:block"><div className="max-h-[70vh] overflow-auto"><table className="w-full min-w-[850px] text-sm"><thead className="sticky top-0 z-10 bg-stone-50 text-right text-brand"><tr><th className="px-5 py-3">اسم الحساب</th><th className="px-3 py-3">النوع</th><th className="px-3 py-3">الرصيد الأساسي</th><th className="px-3 py-3">الإجراءات</th></tr></thead><tbody>{rows.map((account) => <tr key={account.account_id} className="border-t hover:bg-stone-50"><td className="px-5 py-2.5"><b className="text-brand">{account.customer_name ?? account.name}</b><small className="block text-stone-500">رقم الحساب: {account.code}</small></td><td className="px-3 py-2.5">{accountTypeLabel(account)}</td><td className="whitespace-nowrap px-3 py-2.5"><b>{formatMoney(Math.abs(Number(account.balance)))}</b> <small>{balanceLabel(account.balance)}</small></td><td className="px-3 py-2.5"><div className="flex flex-wrap gap-2"><Link className="btn-outline" to={'/owner/accounts/' + account.account_id}>كشف</Link>{!isInternalAccount(account) && <><Link className="btn-outline" to={'/owner/vouchers?account=' + account.account_id}>سند</Link><button className="btn-outline" onClick={() => onEdit(account)}>تعديل</button><button className="btn-outline text-red-700" onClick={() => onDelete(account)}>حذف</button></>}</div></td></tr>)}</tbody></table></div></div>
  </>;
}
const accountError = (reason: unknown, fallback: string) => {
  const code = reason instanceof ApiError ? reason.code : undefined;
  if (code === 'ACCOUNT_IN_USE') return 'لا يمكن حذف الحساب لوجود حركات مالية مرتبطة به.';
  if (code === 'ACCOUNT_NOT_FOUND') return 'الحساب غير موجود. حدّث القائمة وحاول مرة أخرى.';
  if (code === 'ACCOUNT_UPDATE_NOT_ALLOWED') return 'تعديل اسم هذا الحساب غير مسموح.';
  return apiMessages(reason, fallback).join('، ');
};
type AccountDialog =
  | { mode: 'create' }
  | { mode: 'opening' }
  | { mode: 'edit'; account: LedgerAccount }
  | { mode: 'delete'; account: LedgerAccount };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CreatableAccountKind>('General');
  const [openingAccountId, setOpeningAccountId] = useState<number | null>(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [openingDirection, setOpeningDirection] = useState<'Debit' | 'Credit'>('Debit');
  const [openingDate, setOpeningDate] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await ledgerService.accounts();
      setAccounts(rows);
      setError('');
    } catch (reason) { setError(apiMessages(reason, 'تعذر تحميل الحسابات.').join('، ')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = accounts.filter((account) =>
    `${account.name} ${account.customer_name ?? ''} ${account.customer_phone ?? ''} ${account.code} ${accountTypeLabel(account)}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const everydayAccounts = visible.filter((account) => !isInternalAccount(account));
  const systemAccounts = visible.filter(isInternalAccount);
  const openCreate = () => {
    setName(''); setKind('General'); setDialogError(''); setDialog({ mode: 'create' });
  };
  const openOpening = () => {
    setOpeningAccountId(null); setOpeningAmount(''); setOpeningNotes(''); setOpeningDirection('Debit'); setOpeningDate(''); setDialogError(''); setDialog({ mode: 'opening' });
  };
  const openEdit = (account: LedgerAccount) => {
    setName(account.name); setDialogError(''); setDialog({ mode: 'edit', account });
  };
  const openDelete = (account: LedgerAccount) => {
    setDeleteCountdown(5); setDialogError(''); setDialog({ mode: 'delete', account });
  };
  const closeDialog = useCallback(() => {
    if (!saving) { setDialog(null); setDialogError(''); }
  }, [saving]);
  useEffect(() => {
    if (!dialog) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) closeDialog(); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [dialog, saving, closeDialog]);
  useEffect(() => {
    if (dialog?.mode !== 'delete' || deleteCountdown === 0) return;
    const timer = window.setTimeout(() => setDeleteCountdown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [dialog, deleteCountdown]);
  const submit = async () => {
    if (saving || !dialog) return;
    if (dialog.mode === 'delete' && deleteCountdown > 0) return;
    if ((dialog.mode === 'create' || dialog.mode === 'edit') && (!name.trim() || name.trim().length > 200)) {
      setDialogError('أدخل اسم الحساب بما لا يتجاوز 200 حرف.'); return;
    }
    if (dialog.mode === 'opening') {
      if (openingAccountId === null) { setDialogError('اختر الحساب أولًا.'); return; }
      if (!/^\d+(?:\.\d{1,2})?$/.test(openingAmount.trim()) || !openingDate) {
        setDialogError('أدخل مبلغًا غير سالب بمنزلتين عشريتين كحد أقصى وحدد تاريخ الحركة.'); return;
      }
    }
    setSaving(true); setDialogError('');
    try {
      if (dialog.mode === 'create') {
        await ledgerService.createAccount({ name: name.trim(), kind });
      } else if (dialog.mode === 'opening') {
        await accountsService.createOpening(openingAccountId!, { amount: Number(openingAmount), direction: openingDirection, business_date: openingDate, notes: openingNotes.trim() || undefined });
      } else if (dialog.mode === 'edit') {
        await ledgerService.renameAccount(dialog.account.account_id, name.trim());
      } else {
        await ledgerService.deleteAccount(dialog.account.account_id);
      }
      setDialog(null);
      await load();
    } catch (reason) {
      setDialogError(accountError(reason, dialog.mode === 'delete' ? 'تعذر حذف الحساب.' : dialog.mode === 'edit' ? 'تعذر تعديل الحساب.' : dialog.mode === 'opening' ? 'تعذر تسجيل الرصيد الافتتاحي.' : 'تعذر إنشاء الحساب.'));
    }
    finally { setSaving(false); }
  };
  return <div className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4"><div><p className="text-xs font-black text-gold-dark">الدفتر المالي</p><h1 className="text-3xl font-black text-brand">الحسابات</h1><p className="text-sm text-stone-500">راجع أرصدة الحسابات وحركاتها أو سجّل سندًا.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" onClick={openOpening}>رصيد افتتاحي</button><button type="button" className="btn-primary" onClick={openCreate}>إضافة حساب</button></div></header>
    <label className="block max-w-lg"><span className="rep-label">البحث</span><input className="rep-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الحساب أو نوعه أو رقمه" /></label>
    {error && <div className="rep-error">{error} <button className="underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p className="text-sm text-stone-500">جارٍ تحميل الحسابات…</p>}
    {!loading && !!visible.length && <>
      <p className="text-sm text-stone-500">{visible.length} حساب{search ? ` من أصل ${accounts.length}` : ''} · الأرصدة بالعملة الأساسية</p>
      {!!everydayAccounts.length && <section className="space-y-3" aria-label="الحسابات"><h2 className="text-lg font-black text-brand">الحسابات</h2><AccountList rows={everydayAccounts} onEdit={openEdit} onDelete={openDelete} /></section>}
      {!!systemAccounts.length && <section className="space-y-3" aria-label="حسابات النظام"><h2 className="text-lg font-black text-brand">حسابات النظام</h2><AccountList rows={systemAccounts} onEdit={openEdit} onDelete={openDelete} /></section>}
    </>}
    {!loading && !visible.length && !error && <p className="rounded-xl border bg-white p-8 text-center text-stone-500">{search ? 'لا توجد حسابات مطابقة.' : 'لا توجد حسابات بعد. استخدم «إضافة حساب» للبدء.'}</p>}
    {dialog && createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <button type="button" className="absolute inset-0" aria-label="إغلاق النافذة" onClick={closeDialog} disabled={saving} />
      <form role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="relative z-10 max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <h2 id="account-dialog-title" className="text-xl font-black text-brand">{dialog.mode === 'create' ? 'إضافة حساب' : dialog.mode === 'edit' ? 'تعديل اسم الحساب' : dialog.mode === 'opening' ? 'تسجيل رصيد افتتاحي' : 'حذف الحساب'}</h2>
        {dialog.mode === 'create' && <RepSelect label="نوع الحساب" value={kind} options={accountKindOptions} onChange={(value) => { setKind(value); setDialogError(''); }} disabled={saving} />}
        {(dialog.mode === 'create' || dialog.mode === 'edit') && <label className="block"><span className="rep-label">اسم الحساب</span><input className="rep-control" autoFocus value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} disabled={saving} /></label>}
        {dialog.mode === 'opening' && <><p className="text-sm text-stone-600">حدد الحساب والمبلغ واتجاه الرصيد وتاريخ الحركة. يوجد مستند افتتاحي واحد لكل حساب، والصفر مسموح.</p><AccountPicker accounts={accounts.filter((account) => !account.is_system && ['General', 'Cash', 'Bank'].includes(account.kind))} value={openingAccountId} onChange={(value) => { setOpeningAccountId(value); setDialogError(''); }} label="الحساب" disabled={saving} /><label className="block"><span className="rep-label">الرصيد الافتتاحي بالعملة الأساسية</span><input className="rep-control" type="text" inputMode="decimal" dir="ltr" value={openingAmount} onChange={(event) => { setOpeningAmount(event.target.value); setDialogError(''); }} placeholder="مثال: 1000 أو 0" disabled={saving} /></label><label className="block"><span className="rep-label">اتجاه الرصيد</span><select className="rep-control" value={openingDirection} onChange={(event) => setOpeningDirection(event.target.value === 'Credit' ? 'Credit' : 'Debit')} disabled={saving}><option value="Debit">مدين</option><option value="Credit">دائن</option></select></label><label className="block"><span className="rep-label">تاريخ الحركة</span><input className="rep-control" type="date" value={openingDate} onChange={(event) => setOpeningDate(event.target.value)} disabled={saving} required /></label><label className="block"><span className="rep-label">ملاحظة (اختياري)</span><input className="rep-control" value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} disabled={saving} /></label></>}
        {dialog.mode === 'edit' && <p className="text-sm text-stone-500">سيبقى معرف الحساب ورمزه ونوعه كما هي.</p>}
        {dialog.mode === 'delete' && <p className="text-sm text-stone-600">هل تريد حذف «{dialog.account.customer_name ?? dialog.account.name}»؟ لا يمكن حذف حساب مرتبط بحركات مالية أو شيكات أو طلبات بيع.{(dialog.account.is_system || dialog.account.customer_id !== null) && ' قد يُنشأ هذا الحساب تلقائيًا من جديد عند استخدامه لاحقًا.'}</p>}
        {dialog.mode === 'delete' && deleteCountdown > 0 && <p className="text-sm text-stone-600" role="status">يمكن تأكيد الحذف بعد {deleteCountdown} ثوانٍ.</p>}
        {dialogError && <p className="rep-error" role="alert">{dialogError}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={closeDialog} disabled={saving}>إلغاء</button><button type="submit" className={dialog.mode === 'delete' ? 'btn-outline text-red-700' : 'btn-primary'} disabled={saving || (dialog.mode === 'delete' && deleteCountdown > 0)}>{saving ? 'جارٍ الحفظ…' : dialog.mode === 'delete' ? deleteCountdown > 0 ? `تأكيد الحذف (${deleteCountdown})` : 'تأكيد الحذف' : dialog.mode === 'opening' ? 'تسجيل الرصيد' : 'حفظ'}</button></div>
      </form>
    </div>, document.body)}
  </div>;
}

export function AccountStatementPage() {
  const id = Number(useParams().id);
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [company, setCompany] = useState<CompanyProfileDataDto | null>(null);
  const [allPeriod, setAllPeriod] = useState(true);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [query, setQuery] = useState({ all: true, from: '', to: '' });
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  useEffect(() => { companyProfileService.get().then((result) => setCompany(result.company)).catch(() => undefined); }, []);
  const load = useCallback(async () => { try { setStatement(await ledgerService.statement(id, query.all ? undefined : query.from || undefined, query.all ? undefined : query.to || undefined)); setError(''); } catch (reason) { setError(apiMessages(reason, 'تعذر تحميل كشف الحساب.').join('، ')); } }, [id, query]);
  useEffect(() => { void load(); }, [load]);
  const apply = (event: FormEvent) => { event.preventDefault(); if (!allPeriod && from && to && from > to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; } setQuery({ all: allPeriod, from, to }); };
  if (!statement) return <div className="space-y-4" dir="rtl"><Link className="text-gold-dark" to="/owner/accounts">← الحسابات</Link>{error ? <div className="rep-error">{error}</div> : <p>جارٍ تحميل كشف الحساب…</p>}</div>;
  const { account } = statement;
  const accountName = account.customer_name ?? account.name;
  const period = query.all ? 'كل الفترة' : `${query.from ? formatOrderDate(query.from) : 'البداية'} — ${query.to ? formatOrderDate(query.to) : 'اليوم'}`;
  return <div className="space-y-6" dir="rtl"><Link className="text-sm font-bold text-gold-dark" to="/owner/accounts">← جميع الحسابات</Link><header className="border-b pb-5"><p className="text-xs font-black text-gold-dark">وثيقة مالية كاملة</p><h1 className="mt-1 text-3xl font-black text-brand">كشف حساب {accountName}</h1><p className="mt-2 text-sm text-stone-500">اختر الفترة لعرض الكشف وطباعته أو حفظه PDF.</p></header>
    <section className="rounded-2xl border bg-white p-5"><form onSubmit={apply} className="grid items-end gap-4 sm:grid-cols-[180px_180px_auto]"><RepDateInput label="من تاريخ" value={from} max={to || undefined} disabled={allPeriod} onChange={setFrom} /><RepDateInput label="إلى تاريخ" value={to} min={from || undefined} disabled={allPeriod} onChange={setTo} /><button className="btn-primary min-h-11">عرض الكشف</button><label className="flex min-h-11 items-center gap-3 rounded-xl border px-4 py-2.5 sm:col-span-full"><input type="checkbox" checked={allPeriod} onChange={(event) => setAllPeriod(event.target.checked)} /><b className="text-sm">كل الفترة</b></label></form></section>
    {error && <div className="rep-error">{error}</div>}
    <article ref={printRef} className="print-document rounded-2xl border bg-white p-5 sm:p-8"><PrintHeader company={company} title="كشف حساب" subtitle={`الفترة: ${period}`} /><div className="mb-5 flex flex-wrap justify-end gap-2" data-print-ignore><Link className="btn-outline" to={`/owner/vouchers?account=${id}`}>سند</Link><button className="btn-primary" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: `كشف حساب ${accountName}`, orientation: 'portrait' })}>طباعة / حفظ PDF</button></div><header className="report-print-hide border-b pb-5"><h2 className="text-2xl font-black text-brand">كشف حساب</h2><p>الفترة: {period}</p></header><section className="my-5 rounded-xl bg-stone-50 p-4"><b className="text-brand">{accountName}</b>{account.customer_phone && <p className="text-sm text-stone-600">{account.customer_phone}</p>}</section><section className="print-summary grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-4"><p className="text-sm text-stone-500">رصيد أول المدة</p><b className="text-xl text-brand">{formatMoney(Math.abs(Number(statement.opening_balance)))} {balanceLabel(statement.opening_balance)}</b></div><div className="rounded-xl bg-stone-50 p-4"><p className="text-sm text-stone-500">الرصيد النهائي</p><b className="text-xl text-brand">{formatMoney(Math.abs(Number(statement.closing_balance)))} {balanceLabel(statement.closing_balance)}</b></div></section><section className="statement-section mt-8"><h2 className="border-b-2 border-brand pb-2 text-xl font-black text-brand">سجل الحساب</h2><div className="mt-4 overflow-x-auto"><table className="statement-table w-full min-w-[760px] border-collapse text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'البيان', 'مدين', 'دائن', 'الرصيد', 'المرجع'].map((label) => <th key={label} className="border p-3 text-right">{label}</th>)}</tr></thead><tbody>{statement.entries.map((line) => <Fragment key={line.journal_line_id}><tr><td className="whitespace-nowrap border p-3">{formatOrderDate(line.journal_entries.occurred_at)}</td><td className="border p-3"><b>{statementMovementName[line.journal_entries.voucher_type] ?? line.journal_entries.voucher_type}</b>{line.journal_entries.notes && <small className="block whitespace-pre-wrap text-stone-600">{line.journal_entries.notes}</small>}</td><td className="border p-3">{formatMoney(line.debit)}</td><td className="border p-3">{formatMoney(line.credit)}</td><td className="border p-3 font-black">{formatMoney(Math.abs(Number(line.balance)))} {balanceLabel(line.balance)}</td><td className="border p-3">{line.source_details?.return_number ?? `#${line.journal_entry_id}`}</td></tr>{(line.source_details || line.counterpart_lines?.length > 0) && <tr><td colSpan={6} className="border p-2">{line.source_details && <StatementSourceDetailsView details={line.source_details} />}<StatementCounterparts lines={line.counterpart_lines ?? []} /></td></tr>}</Fragment>)}</tbody></table>{!statement.entries.length && <p className="p-6 text-center text-stone-500">لا توجد حركات ضمن الفترة المحددة.</p>}</div></section></article>
  </div>;
}
