import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth';
import Modal from '@/components/ui/Modal';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { CheckCircle2, CopyPlus, Plus, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { accountsService, currenciesService, ledgerService, paymentsService, type AccountKind, type CreatePaymentDto, type CurrencyDto, type LedgerAccount, type VoucherInput } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PaymentDraftTable, { type PaymentDraftTableRow } from './PaymentDraftTable';
import { formatMoney } from '@/utils/money';
import AccountPicker from './AccountPicker';
import { isInternalAccount } from './accountLabels';
import { businessToday } from './accountUiUtils';

type VoucherType = 'Receipt' | 'Disbursement' | 'Journal';
type DraftLine = { key: number; account_id: number | null; side: 'debit' | 'credit'; amount: string };
type BatchStep =
  { key: PaymentDraftTableRow['key']; accountId: number; type: 'Receipt' | 'Disbursement'; input: CreatePaymentDto }
type Pending = { kind: 'journal'; input: VoucherInput; summary: string }
  | { kind: 'batch'; steps: BatchStep[]; summary: string };

const treasuryKinds: AccountKind[] = ['Cash', 'Bank', 'CheckHolding', 'Clearing'];
const validAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number.isFinite(Number(value)) && Number(value) > 0;
const cents = (value: string) => validAmount(value) ? Math.round(Number(value) * 100) : 0;
const convertedCents = (amount: string, rate: string): number | null => {
  if (!validAmount(amount) || !/^\d+(?:\.\d{1,6})?$/.test(rate.trim())) return null;
  const [amountWhole, amountFraction = ''] = amount.trim().split('.');
  const [rateWhole, rateFraction = ''] = rate.trim().split('.');
  const minor = BigInt(amountWhole) * 100n + BigInt(amountFraction.padEnd(2, '0'));
  const rateMicro = BigInt(rateWhole) * 1_000_000n + BigInt(rateFraction.padEnd(6, '0'));
  const result = (minor * rateMicro + 500_000n) / 1_000_000n;
  return result > 0n && result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
};
const newLines = (accountId: number | null = null): DraftLine[] => [
  { key: 1, account_id: accountId, side: 'debit', amount: '' },
  { key: 2, account_id: null, side: 'credit', amount: '' },
];
const newDraft = (key: number, currencyId = ''): PaymentDraftTableRow => ({
  key, amount: '', currencyId, rate: '1', method: 'Cash', paidAt: businessToday(), notes: '',
  checkNumber: '', accountNumber: '', bankNumber: '', branchNumber: '', dueDate: '',
});
const two = (value: number) => String(value).padStart(2, '0');
const addMonths = (value: string, count: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const target = new Date(year, month - 1 + count, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${target.getFullYear()}-${two(target.getMonth() + 1)}-${two(Math.min(day, last))}`;
};

export default function VouchersPage() {
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const [params] = useSearchParams();
  const preselected = Number(params.get('account')) || null;
  const appliedAccount = useRef<number | null>(null);
  const nextKey = useRef(2);
  const nextLineKey = useRef(3);
  const submitting = useRef(false);
  const [accounts, setAccounts] = useState<Array<Pick<LedgerAccount, 'account_id' | 'name' | 'kind' | 'account_number' | 'is_system'>>>([]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState<VoucherType>('Receipt');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [cashId, setCashId] = useState<number | null>(null);
  const [bankId, setBankId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<PaymentDraftTableRow[]>([newDraft(1)]);
  const [checksToAdd, setChecksToAdd] = useState('1');
  const [lines, setLines] = useState<DraftLine[]>(() => newLines(preselected));
  const [journalNotes, setJournalNotes] = useState('');
  const [journalDate, setJournalDate] = useState(businessToday);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successHasChecks, setSuccessHasChecks] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const errorRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!error) return;
    errorRegion.current?.focus({preventScroll:true});
    errorRegion.current?.scrollIntoView({block:'center'});
  }, [error]);

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [accountRows, response] = await Promise.all([admin ? ledgerService.accounts() : accountsService.allOptions().then(rows => rows.map(row => ({...row, is_system: false}))), currenciesService.list()]);
      const rows = Array.isArray(response) ? response : response.items ?? response.currencies ?? [];
      const active = rows.filter((currency) => currency.is_active);
      setAccounts(accountRows); setCurrencies(active);
      setCashId((current) => {
        return accountRows.some((account) => account.kind === 'Cash' && account.account_id === current) ? current : null;
      });
      const baseId = String(active.find((currency) => currency.is_base)?.currency_id ?? '');
      setDrafts((current) => current.map((draft) => draft.currencyId ? draft : { ...draft, currencyId: baseId }));
    } catch (reason) { setLoadError(apiMessages(reason, 'تعذر تحميل الحسابات أو العملات.').join('، ')); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!preselected || appliedAccount.current === preselected) return;
    const account = accounts.find((item) => item.account_id === preselected);
    if (!account) return;
    if (isInternalAccount(account)) { setLines(newLines()); return; }
    appliedAccount.current = preselected;
    if (account.kind === 'Cash') setCashId(account.account_id);
    else if (account.kind === 'Bank') { setBankId(account.account_id); setType('Journal'); setLines((current) => current.map((line, index) => index === 0 ? { ...line, account_id: account.account_id } : line)); }
    else if (treasuryKinds.includes(account.kind)) {
      setType('Journal');
      setLines((current) => current.map((line, index) => index === 0 ? { ...line, account_id: account.account_id } : line));
    } else setAccountId(account.account_id);
  }, [accounts, preselected]);

  const selectedAccount = accounts.find((account) => account.account_id === accountId);
  const manualAccounts = accounts.filter((account) => !isInternalAccount(account) && ['General', 'Cash', 'Bank'].includes(account.kind));
  const baseCurrency = currencies.find((currency) => currency.is_base);
  const cashChoices = manualAccounts.filter((account) => account.kind === 'Cash');
  const treasuryAccountIds = accounts.filter((account) => treasuryKinds.includes(account.kind)).map((account) => account.account_id);
  const hasCash = drafts.some((draft) => draft.method === 'Cash');
  const hasCheck = drafts.some((draft) => draft.method === 'Check');
  const totalCents = useMemo(() => drafts.reduce((sum, draft) => {
    const currency = currencies.find((item) => item.currency_id === Number(draft.currencyId));
    return sum + (convertedCents(draft.amount, currency?.is_base ? '1' : draft.rate) ?? 0);
  }, 0), [currencies, drafts]);
  const total = totalCents / 100;
  const methodTotal = (method: PaymentDraftTableRow['method']) => drafts.filter(draft => draft.method === method).reduce((sum, draft) => sum + (convertedCents(draft.amount, currencies.find(currency => currency.currency_id === Number(draft.currencyId))?.is_base ? '1' : draft.rate) ?? 0), 0) / 100;
  const debitCents = useMemo(() => lines.reduce((sum, line) => sum + (line.side === 'debit' ? cents(line.amount) : 0), 0), [lines]);
  const creditCents = useMemo(() => lines.reduce((sum, line) => sum + (line.side === 'credit' ? cents(line.amount) : 0), 0), [lines]);
  const balanced = debitCents > 0 && debitCents === creditCents;
  const clearMessage = () => { setError(''); setSuccess(''); };
  const editLine = (key: number, changes: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...changes } : line)); clearMessage();
  };
  const editDraft = (index: number, change: Partial<Omit<PaymentDraftTableRow, 'key'>>) => {
    setDrafts((current) => current.map((draft, i) => {
      if (i !== index) return draft;
      const currency = change.currencyId ? currencies.find((item) => item.currency_id === Number(change.currencyId)) : null;
      return { ...draft, ...change, ...(currency ? { rate: currency.is_base ? '1' : '' } : {}) };
    })); clearMessage();
  };
  const addChecks = () => {
    const count = Number(checksToAdd);
    if (!Number.isSafeInteger(count) || count < 1) {
      setError('أدخل عدد شيكات صحيحًا أكبر من صفر.'); return;
    }
    const source = [...drafts].reverse().find((draft) => draft.method === 'Check') ?? drafts[drafts.length - 1] ?? newDraft(0, String(baseCurrency?.currency_id ?? ''));
    const number = /^\d+$/.test(source.checkNumber.trim()) ? BigInt(source.checkNumber.trim()) : null;
    setDrafts((current) => [...current, ...Array.from({ length: count }, (_, index) => ({ ...source,
      key: nextKey.current++, method: 'Check' as const, checkNumber: number === null ? '' : String(number + BigInt(index + 1)),
      dueDate: source.dueDate ? addMonths(source.dueDate, index + 1) : '',
    }))]);
    setChecksToAdd('1'); clearMessage();
  };
  useEffect(() => {
    if (!pending || saving) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPending(null); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [pending, saving]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || loading || loadError) return;
    if (type === 'Journal') {
      if (lines.length < 2 || lines.some((line) => !line.account_id || !validAmount(line.amount) || !manualAccounts.some((account) => account.account_id === line.account_id)) || !balanced) {
        setError('أكمل أطراف القيد بمبالغ صحيحة وتأكد من تساوي المدين والدائن.'); return;
      }
      const net = new Map<number, number>();
      for (const line of lines) net.set(line.account_id!, (net.get(line.account_id!) ?? 0) + (line.side === 'debit' ? cents(line.amount) : -cents(line.amount)));
      if ([...net.values()].every(amount => amount === 0)) { setError('لا يمكن تسجيل تحويل بلا أثر بين الحسابات. اختر حسابين مختلفين.'); return; }
      if (!journalNotes.trim()) { setError('أدخل ملاحظة توضح سبب القيد.'); return; }
      if (!journalDate) { setError('اختر تاريخ القيد.'); return; }
      const input: VoucherInput = { type, occurred_at: journalDate, notes: journalNotes.trim(), lines: lines.map((line) => ({ account_id: line.account_id!, [line.side]: Number(line.amount) })) };
      const summary = `سند قيد بقيمة ${formatMoney(debitCents / 100, baseCurrency)}\n${lines.map((line) => `${line.side === 'debit' ? 'مدين' : 'دائن'}: ${accounts.find((account) => account.account_id === line.account_id)?.name} — ${formatMoney(line.amount, baseCurrency)}`).join('\n')}`;
      setPending({ kind: 'journal', input, summary });
      return;
    }
    if (!selectedAccount || isInternalAccount(selectedAccount) || treasuryKinds.includes(selectedAccount.kind)) { setError('اختر الحساب المقابل.'); return; }
    if (!drafts.length) { setError('أضف سطر قبض أو صرف واحدًا على الأقل.'); return; }
    if (!baseCurrency) { setError('العملة الأساسية غير محددة. تحقق من إعدادات العملات.'); return; }
    const cashAccount = cashChoices.find((account) => account.account_id === cashId);
    const bankAccount = manualAccounts.find((account) => account.account_id === bankId);
    if (hasCheck && (selectedAccount.is_system || !['General'].includes(selectedAccount.kind))) { setError('اختر حسابًا عامًا للشيك.'); return; }
    if (hasCash && !cashAccount) { setError('اختر صندوقًا نقديًا للسند.'); return; }
    if (type === 'Disbursement' && hasCheck && bankAccount?.kind !== 'Bank') { setError('اختر البنك الذي يُسحب منه مبلغ الشيك.'); return; }
    const steps: BatchStep[] = [];
    for (const [index, draft] of drafts.entries()) {
      const currency = currencies.find((item) => item.currency_id === Number(draft.currencyId));
      const rate = currency?.is_base ? 1 : Number(draft.rate);
      const amountInBaseCents = convertedCents(draft.amount, currency?.is_base ? '1' : draft.rate);
      if (!currency || amountInBaseCents === null) {
        setError(`راجع المبلغ والعملة وسعر الصرف في السطر ${index + 1}.`); return;
      }
      const origin = currency.is_base ? '' : `المبلغ الأصلي: ${draft.amount} ${currency.code}، سعر الصرف: ${draft.rate}`;
      const notes = [draft.notes.trim(), origin].filter(Boolean).join('\n') || undefined;
      if (draft.method === 'Check' && (!draft.checkNumber.trim() || !draft.dueDate)) {
        setError(`رقم الشيك وتاريخ استحقاقه مطلوبان في السطر ${index + 1}.`); return;
      }
      {
        const input: CreatePaymentDto = {
          amount: Number(draft.amount), currency_id: currency.currency_id, exchange_rate: rate,
          payment_method: draft.method, paid_at: draft.paidAt || undefined,
          notes,
          ...(draft.method === 'Cash' ? { money_account_id: cashAccount!.account_id } : {}),
          ...(draft.method === 'Check' ? { check: {
            check_number: draft.checkNumber.trim(), account_number: draft.accountNumber.trim() || undefined,
            bank_number: draft.bankNumber.trim() || undefined, branch_number: draft.branchNumber.trim() || undefined,
            due_date: draft.dueDate,
          }, ...(type === 'Disbursement' ? { bank_account_id: bankId! } : {}) } : {}),
        };
        steps.push({ key: draft.key, accountId: selectedAccount.account_id, type, input });
      }
    }
    const details = drafts.map((draft, index) => {
      const currency = currencies.find((item) => item.currency_id === Number(draft.currencyId))!;
      const base = convertedCents(draft.amount, currency.is_base ? '1' : draft.rate)! / 100;
      return `${index + 1}. ${draft.method === 'Check' ? 'شيك' : 'نقد'}: ${draft.amount} ${currency.code}${currency.is_base ? '' : ` × ${draft.rate} = ${formatMoney(base, baseCurrency)}`}`;
    }).join('\n');
    const cashLocation = hasCash ? `\n${type === 'Receipt' ? 'صندوق الاستلام' : 'صندوق الدفع'}: ${cashAccount?.name}` : '';
    const checkBank = hasCheck ? (type === 'Disbursement' ? `\nالبنك الذي يُسحب منه مبلغ الشيك: ${bankAccount?.name}` : '\nوجهة الشيكات: خزنة الشيكات') : '';
    const summary = `${type === 'Receipt' ? 'سند قبض' : 'سند صرف'} — ${selectedAccount.name}\n${steps.length} سطر، منها ${drafts.filter((draft) => draft.method === 'Check').length} شيك${cashLocation}${checkBank}\n${details}\nالإجمالي بالعملة الأساسية: ${formatMoney(total, baseCurrency)}`;
    setPending({ kind: 'batch', steps, summary });
  };

  const save = async () => {
    if (!pending || submitting.current) return;
    submitting.current = true; setSaving(true); setError(''); setSuccess('');
    let completed = 0;
    try {
      if (pending.kind === 'journal') {
        const result = await ledgerService.voucher(pending.input) as { journal_entry_id: number };
        setSuccess(`حُفظ سند القيد رقم ${result.journal_entry_id} بنجاح.`); setSuccessHasChecks(false);
        setLines(newLines()); setJournalNotes('');
      } else {
        for (const step of pending.steps) {
          if (step.type === 'Receipt') await paymentsService.createReceipt(step.accountId, step.input);
          else await paymentsService.createDisbursement(step.accountId, step.input);
          completed++;
          setDrafts((current) => current.filter((draft) => draft.key !== step.key));
        }
        setSuccess(`تم حفظ ${completed === 1 ? 'السند' : `${completed} سندات`} بنجاح.`); setSuccessHasChecks(pending.steps.some(step=>step.input.payment_method==='Check'));
        setDrafts([newDraft(nextKey.current++, String(baseCurrency?.currency_id ?? ''))]);
      }
      setPending(null); void load();
    } catch (reason) {
      setPending(null);
      setError(`${completed ? `حُفظ ${completed} سطر، وبقيت الأسطر غير المحفوظة في الجدول. ` : ''}${apiMessages(reason, 'تعذر حفظ السند.').join('، ')}`);
      void load();
    } finally { submitting.current = false; setSaving(false); }
  };

  const renderJournalColumn = (side: DraftLine['side']) => {
    const sideLines = lines.filter((line) => line.side === side);
    const label = side === 'credit' ? 'الدائن' : 'المدين';
    return <div className="min-w-0 rounded-2xl border border-stone-200 bg-stone-50/70 p-3 sm:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><h3 className="text-lg font-black text-brand">{side === 'credit' ? 'الطرف الأول · دائن' : 'الطرف الثاني · مدين'}</h3><p className="text-xs text-stone-500">{sideLines.length} {sideLines.length === 1 ? 'حساب' : 'حسابات'}</p></div>
        <button type="button" className="btn-outline gap-1.5" onClick={() => { setLines((current) => [...current, { key: nextLineKey.current++, account_id: null, side, amount: '' }]); clearMessage(); }}><Plus className="h-4 w-4" /> إضافة حساب</button>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_96px_40px] gap-2 px-2 pb-2 text-xs font-bold text-stone-500 sm:grid-cols-[minmax(0,1fr)_130px_40px]"><span>الحساب</span><span>المبلغ</span><span className="sr-only">إزالة</span></div>
      <div className="space-y-2">{sideLines.map((line, index) => <div key={line.key} className="voucher-journal-row grid min-w-0 grid-cols-[minmax(0,1fr)_96px_40px] items-center gap-2 rounded-xl border border-stone-200 bg-white p-2 shadow-sm sm:grid-cols-[minmax(0,1fr)_130px_40px]">
        <AccountPicker accounts={manualAccounts} label={`حساب ${label} ${index + 1}`} value={line.account_id} onChange={(id) => editLine(line.key, { account_id: id })} disabled={loading || !!loadError} compact showIdentity />
        <label className="block min-w-0"><span className="sr-only">مبلغ حساب {label} {index + 1}</span><input className="rep-control text-left" dir="ltr" inputMode="decimal" placeholder="0.00" value={line.amount} onChange={(event) => editLine(line.key, { amount: event.target.value })} /></label>
        <button type="button" aria-label={`إزالة حساب ${label} ${index + 1}`} title="إزالة الحساب" className="grid h-10 w-10 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-300" disabled={sideLines.length <= 1} onClick={() => { setLines((current) => current.filter((row) => row.key !== line.key)); clearMessage(); }}><Trash2 className="h-4 w-4" /></button>
      </div>)}</div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 text-sm font-black text-brand"><span>إجمالي {label}</span><span>{formatMoney((side === 'credit' ? creditCents : debitCents) / 100, baseCurrency)}</span></div>
    </div>;
  };

  return <div className="vouchers-page min-w-0 w-full space-y-4" dir="rtl">
    <header className="border-b border-stone-200 pb-4"><p className="text-xs font-black text-gold-dark">الدفتر المالي</p><h1 className="text-3xl font-black text-brand">السندات</h1><p className="mt-1 text-sm text-stone-500">{type === 'Journal' ? 'قيد مباشر بين الحسابات، مع توضيح الطرف الدائن والطرف المدين.' : <>نقد أو شيك لكل سطر. بيانات الشيكات وحالاتها في {admin ? <Link className="font-bold text-gold-dark underline" to="/owner/checks">صفحة الشيكات</Link> : 'صفحة الشيكات'}.</>}</p></header>
    <div role="group" aria-label="نوع السند" className="grid grid-cols-3 gap-2 rounded-2xl bg-stone-100 p-1.5">
      {([['Receipt', 'سند قبض'], ['Disbursement', 'سند صرف'], ['Journal', 'سند قيد']] as const).map(([value, label]) =>
        <button key={value} type="button" aria-pressed={type === value} className={`min-h-11 rounded-xl px-2 py-2 text-center text-sm font-black transition sm:text-base ${type === value ? 'bg-white text-brand shadow-sm ring-1 ring-gold/60' : 'text-stone-600 hover:bg-white/70'}`} onClick={() => { setType(value); clearMessage(); }}>{label}</button>)}
    </div>
    {loadError && <div className="rep-error" role="alert">{loadError} <button type="button" className="mr-2 underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p className="text-sm text-stone-500" role="status">جارٍ تحميل الحسابات والعملات…</p>}
    {!loading && !loadError && !manualAccounts.length && <p role="status" className="rep-section p-4 text-sm text-stone-500">لا توجد حسابات متاحة. أنشئ حسابًا أولًا من صفحة الحسابات.</p>}
    <form onSubmit={submit} className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        {type === 'Journal' ? <div className="space-y-4">
          <div className="border-b border-stone-100 pb-4"><h2 className="font-black text-brand">أطراف القيد</h2><p className="text-xs text-stone-500">اختر الحساب والمبلغ لكل طرف. في تحويل الصندوق أو البنك: المصدر دائن، والوجهة مدين.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">{renderJournalColumn('credit')}{renderJournalColumn('debit')}</div>
          <div className="flex flex-wrap gap-6 rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand" aria-live="polite"><span>المدين: {formatMoney(debitCents / 100, baseCurrency)}</span><span>الدائن: {formatMoney(creditCents / 100, baseCurrency)}</span><span className={balanced ? 'text-emerald-700' : 'text-red-700'}>{balanced ? 'القيد متوازن' : `الفرق: ${formatMoney(Math.abs(debitCents - creditCents) / 100, baseCurrency)}`}</span></div>
          <RepDateInput label="تاريخ القيد" value={journalDate} onChange={setJournalDate} /><label className="block"><span className="rep-label">سبب القيد</span><textarea className="rep-control min-h-24" rows={3} value={journalNotes} onChange={(event) => { setJournalNotes(event.target.value); clearMessage(); }} /></label>
        </div> : <div className="space-y-5">
          <AccountPicker accounts={manualAccounts} kinds={['General']} label={type === 'Receipt' ? 'المقبوض منه · حساب عام' : 'المدفوع له · حساب عام'} exclude={treasuryAccountIds} value={accountId} onChange={(id) => { setAccountId(id); clearMessage(); }} disabled={loading || !!loadError} showIdentity />
          <div className="grid items-start gap-3 md:grid-cols-2">
            {hasCash && <section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-brand">النقد</h2><span className="text-sm font-bold text-brand">{formatMoney(methodTotal('Cash'), baseCurrency)}</span></div><AccountPicker accounts={cashChoices} label={type === 'Receipt' ? 'صندوق استلام النقد' : 'صندوق الصرف'} kinds={['Cash']} value={cashId} onChange={(id) => { setCashId(id); clearMessage(); }} disabled={loading || !!loadError || !cashChoices.length} showIdentity />{!loading && !loadError && !cashChoices.length && <p className="mt-2 text-sm text-stone-500">لا توجد صناديق نقد. اطلب من الأدمن إنشاء صندوق من {admin ? <Link className="underline" to="/owner/accounts?type=Cash&page=1">الحسابات</Link> : 'الحسابات'}.</p>}</section>}
            {hasCheck && <section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-brand">الشيكات</h2><span className="text-sm font-bold text-brand">{formatMoney(methodTotal('Check'), baseCurrency)}</span></div>{type === 'Receipt' ? <div><p className="font-bold text-brand">خزنة الشيكات</p><p className="mt-1 text-xs leading-6 text-stone-500">تُحفظ الشيكات هنا. إيداعها بالبنك من {admin ? <Link to="/owner/checks" className="underline">صفحة الشيكات</Link> : 'صفحة الشيكات'}.</p></div> : <><AccountPicker accounts={manualAccounts} label="البنك الذي يُسحب منه مبلغ الشيك" kinds={['Bank']} value={bankId} onChange={(id) => { setBankId(id); clearMessage(); }} disabled={loading || !!loadError} showIdentity /></>}</section>}
          </div>
          <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-brand">جدول الدفعات</h2><p className="text-xs text-stone-500">العملات النشطة تُحمّل من قاعدة البيانات. أدخل سعر الصرف إذا اخترت عملة غير أساسية.</p></div><button type="button" className="btn-outline" onClick={() => { setDrafts((current) => [...current, newDraft(nextKey.current++, String(baseCurrency?.currency_id ?? ''))]); clearMessage(); }}><Plus className="h-4 w-4" /> إضافة دفعة</button></div><PaymentDraftTable scrollable rows={drafts} currencies={currencies} onChange={editDraft} onRemove={(index) => { setDrafts((current) => current.filter((_, i) => i !== index)); clearMessage(); }} /></div>
          <div className="flex flex-wrap items-center gap-2"><div className="flex items-center overflow-hidden rounded-lg border border-brand/15 bg-white"><input aria-label="عدد الشيكات المراد إضافتها" className="h-11 w-16 border-0 px-2 text-center text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold" type="number" min="1" value={checksToAdd} onChange={(event) => setChecksToAdd(event.target.value)} /><button type="button" className="inline-flex min-h-11 items-center gap-2 bg-brand-50 px-3 text-xs font-black text-brand hover:bg-brand-100" onClick={addChecks}><CopyPlus className="h-4 w-4" /> إضافة شيكات</button></div><span className="text-xs text-stone-500">تُنسخ بيانات آخر شيك مع زيادة الرقم والاستحقاق، دون حد ثابت لعدد الشيكات.</span></div>
          <div className="rounded-xl bg-brand-50 p-3 font-black text-brand">الإجمالي بالعملة الأساسية: {formatMoney(total, baseCurrency)}</div>
        </div>}
      </section>
      {error && <div ref={errorRegion} tabIndex={-1} className="rep-error scroll-mt-24 outline-none" role="alert">{error}</div>}
      <div className="flex justify-end"><button type="submit" className="btn-primary min-w-36" disabled={saving || loading || !!loadError || !accounts.length}>{saving ? 'جارٍ الاعتماد…' : 'اعتماد السند'}</button></div>
    </form>
    <Modal open={!!success} title="تم الحفظ" size="sm" onClose={()=>setSuccess('')} footer={<div dir="rtl" className="grid gap-2"><button type="button" className="btn-primary min-h-11 w-full" onClick={()=>setSuccess('')}>حسنًا</button>{admin && successHasChecks && <Link className="btn-outline min-h-11 justify-center" to="/owner/checks">متابعة الشيكات</Link>}</div>}>
      <div dir="rtl" role="status" className="flex flex-col items-center gap-3 py-3 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span><p className="text-lg font-bold text-brand">{success}</p>{successHasChecks && <p className="text-sm text-stone-500">يمكنك متابعة الشيكات من صفحة الشيكات.</p>}</div>
    </Modal>
    <Modal open={!!pending} title="مراجعة السند" onClose={saving?()=>undefined:()=>setPending(null)} size="lg" footer={<div dir="rtl" className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button type="button" className="btn-primary min-h-11 sm:order-2" disabled={saving} onClick={()=>void save()}>{saving?'جارٍ الحفظ…':'تأكيد الاعتماد'}</button><button type="button" className="btn-outline min-h-11" disabled={saving} onClick={()=>setPending(null)}>رجوع للتعديل</button></div>}>
      <div dir="rtl" className="min-w-0 space-y-4 text-brand">
        {pending?.kind === 'batch' && <>
          <div className="rounded-xl border border-stone-200 p-4">
            <p className="text-xs text-stone-500">{pending.steps[0]?.type === 'Receipt' ? 'سند قبض · المقبوض منه' : 'سند صرف · المدفوع له'}</p>
            <p className="mt-1 break-words font-bold">{accounts.find(account=>account.account_id===pending.steps[0]?.accountId)?.name}</p>
            <p className="mt-2 text-xs text-stone-500">{pending.steps.length} دفعة · {pending.steps.filter(step=>step.input.payment_method==='Check').length} شيك</p>
          </div>
          <ol className="space-y-2" aria-label="الدفعات للمراجعة">
            {pending.steps.map((step,index)=>{
              const input=step.input;
              const currency=currencies.find(item=>item.currency_id===input.currency_id);
              const location= input.payment_method==='Cash' ? accounts.find(account=>account.account_id===input.money_account_id)?.name : step.type==='Receipt' ? 'خزنة الشيكات' : accounts.find(account=>account.account_id===input.bank_account_id)?.name;
              return <li key={step.key} className="min-w-0 rounded-xl bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">{index+1}. {input.payment_method==='Check'?'شيك':'نقد'}</span><b dir="ltr" className="text-base tabular-nums">{formatMoney(input.amount,currency)}</b></div>
                <p className="mt-2 break-words text-sm"><span className="text-stone-500">{input.payment_method==='Cash' ? step.type==='Receipt'?'صندوق الاستلام: ':'صندوق الصرف: ' : step.type==='Receipt'?'الوجهة: ':'البنك المسحوب منه: '}</span>{location}</p>
                {input.check && <p className="mt-1 break-words text-xs text-stone-500">رقم الشيك: {input.check.check_number} · الاستحقاق: {input.check.due_date}</p>}
                {currency && !currency.is_base && <p className="mt-1 text-xs text-stone-500">سعر الصرف: {input.exchange_rate} · بالعملة الأساسية: {formatMoney(convertedCents(String(input.amount),String(input.exchange_rate))! / 100,baseCurrency)}</p>}
              </li>;
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 p-4"><span className="text-sm font-bold">الإجمالي بالعملة الأساسية</span><strong dir="ltr" className="text-xl tabular-nums">{formatMoney(pending.steps.reduce((sum,step)=>sum+(convertedCents(String(step.input.amount),String(step.input.exchange_rate))??0),0)/100,baseCurrency)}</strong></div>
          <p className="text-xs text-stone-500">كل دفعة تُحفظ كسند مستقل.</p>
        </>}
        {pending?.kind === 'journal' && <>
          <p className="text-sm text-stone-500">راجع أطراف القيد قبل الاعتماد.</p>
          <div className="grid gap-3 sm:grid-cols-2">{(['debit','credit'] as const).map(side=><section key={side} className="min-w-0 rounded-xl border border-stone-200 p-3"><h3 className="mb-3 text-sm font-bold">{side==='debit'?'المدين':'الدائن'}</h3><ul className="space-y-3">{pending.input.lines.filter(line=>line[side]).map((line,index)=><li key={index} className="min-w-0 border-t border-stone-100 pt-2"><p className="break-words text-sm">{accounts.find(account=>account.account_id===line.account_id)?.name}</p><b dir="ltr" className="mt-1 block text-right tabular-nums">{formatMoney(line[side]!,baseCurrency)}</b></li>)}</ul><p className="mt-3 border-t pt-3 text-sm font-bold">الإجمالي: {formatMoney(pending.input.lines.reduce((sum,line)=>sum+(line[side]??0),0),baseCurrency)}</p></section>)}</div>
          <p className="whitespace-pre-wrap break-words text-sm text-stone-500">{pending.input.notes}</p>
        </>}
      </div>
    </Modal>
  </div>;
}
