import { apiClient } from '@/api/client';
import { locationLabels } from './checkPresentation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { financialVouchersService, type FinancialVoucher, type FinancialVoucherInput } from '@/api/services/financial-vouchers.service';
import { accountAmountColor } from './accountUiUtils';
import { requiredCheckInputError, validCheckBusinessDate } from './checkRequiredInput';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth';
import Modal from '@/components/ui/Modal';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { CheckCircle2, CopyPlus, Plus, Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { accountsService, currenciesService, type AccountKind, type CreatePaymentDto, type CurrencyDto, type LedgerAccount, type VoucherInput } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PaymentDraftTable, { type PaymentDraftTableRow } from './PaymentDraftTable';
import { formatMoney } from '@/utils/money';
import AccountPicker from './AccountPicker';
import { isInternalAccount } from './accountLabels';
import { businessToday } from './accountUiUtils';

type VoucherType = 'Receipt' | 'Disbursement' | 'Journal';
type DraftLine = { line_id?:string; key: number; account_id: number | null; side: 'debit' | 'credit'; amount: string };
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
const newDraft = (key: string | number, currencyId = ''): PaymentDraftTableRow => ({
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
  const [accounts, setAccounts] = useState<Array<Pick<LedgerAccount, 'account_id' | 'name' | 'kind' | 'account_number' | 'is_system'> & {group?:{group_id:number;name:string;reserved_key:string|null}|null}>>([]);
  const resolveAccount=useCallback((a:import('@/api').AccountIdentityOption)=>{setAccounts(rows=>rows.some(r=>r.account_id===a.account_id)?rows:[...rows,{...a,is_system:false}]);if(a.kind==='Bank')setTransferBanks(rows=>rows.some(r=>r.account_id===a.account_id)?rows:[...rows,{...a,kind:'Bank'}]);},[]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState<VoucherType>('Receipt');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [cashId, setCashId] = useState<number | null>(null);
  const [transferBankId, setTransferBankId] = useState<number | null>(null);
  const [transferBanks, setTransferBanks] = useState<Array<{ account_id: number; name: string; kind: 'Bank'; account_number: string | null }>>([]);
  const [bankId, setBankId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<PaymentDraftTableRow[]>([newDraft(1)]);
  const [checksToAdd, setChecksToAdd] = useState('1');
  const [lines, setLines] = useState<DraftLine[]>(() => newLines(preselected));
  const [journalNotes, setJournalNotes] = useState('');
  const [journalDate, setJournalDate] = useState(businessToday);
  const [voucherDocument, setDocument] = useState<FinancialVoucher | null>(null);
  const [cancelOpen,setCancelOpen]=useState(false);
  const [rowAccounts, setRowAccounts] = useState<Record<string, number | null>>({});
  const [rowBanks,setRowBanks] = useState<Record<string,number|null>>({});
  const [rowMoney, setRowMoney] = useState<Record<string, number | null>>({});
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
      const [accountRows, response, mainCash] = await Promise.all([Promise.all((['General','Cash','Bank'] as const).map(type=>accountsService.options({scope:'financial',type,page:1,limit:20}))).then(pages=>pages.flatMap(p=>p.items.map(row=>({...row,is_system:false})))), currenciesService.list(), apiClient.get<{active:boolean;account:{account_id:number;account_number:string;name:string;kind:'Cash'}|null}>('/treasury/main-cash/identity')]);
      if(mainCash.account&&!accountRows.some(a=>a.account_id===mainCash.account!.account_id))accountRows.push({...mainCash.account,phone:null,is_system:false});
      if(preselected&&!accountRows.some(a=>a.account_id===preselected)){
        const selected=await accountsService.get(preselected);
        accountRows.push({...selected,is_system:false});
      }
      const rows = Array.isArray(response) ? response : response.items ?? response.currencies ?? [];
      const active = rows.filter((currency) => currency.is_active);
      const bankRows = accountRows.filter(row=>row.kind==='Bank');
      setTransferBanks(bankRows.filter(row => row.kind === 'Bank').map(row => ({ ...row, kind: 'Bank' as const })));
      setAccounts(accountRows); setCurrencies(active);
      setCashId(mainCash.active?mainCash.account?.account_id??null:null);
      const baseId = String(active.find((currency) => currency.is_base)?.currency_id ?? '');
      setDrafts((current) => current.map((draft) => draft.currencyId ? draft : { ...draft, currencyId: baseId }));
    } catch (reason) { setLoadError(apiMessages(reason, 'تعذر تحميل الحسابات أو العملات.').join('، ')); }
    finally { setLoading(false); }
  }, [preselected]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!preselected || appliedAccount.current === preselected) return;
    const account = accounts.find((item) => item.account_id === preselected);
    if (!account) return;
    if (isInternalAccount(account)) { setLines(newLines()); return; }
    appliedAccount.current = preselected;
    if (account.kind === 'Cash') return;
    else if (account.kind === 'Bank') { setBankId(account.account_id);setTransferBankId(account.account_id); }
    else if (treasuryKinds.includes(account.kind)) {
      setType('Journal');
      setLines((current) => current.map((line, index) => index === 0 ? { ...line, account_id: account.account_id } : line));
    } else setAccountId(account.account_id);
  }, [accounts, preselected]);

  const accountLabel=(id:number)=>{const a=accounts.find(row=>row.account_id===id);return a?[a.name,a.group?.name,a.account_number].filter(Boolean).join(' · '):'حساب غير متاح';};
  const selectedAccount = accounts.find((account) => account.account_id === accountId);
  const manualAccounts = accounts.filter((account) => !isInternalAccount(account) && ['General', 'Cash', 'Bank'].includes(account.kind));
  const baseCurrency = currencies.find((currency) => currency.is_base);
  const cashChoices = manualAccounts.filter((account) => account.kind === 'Cash');
  const treasuryAccountIds = accounts.filter((account) => treasuryKinds.includes(account.kind)).map((account) => account.account_id);
  const hasTransfer = drafts.some(draft => draft.method === 'BankTransfer');
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
    if(change.method && change.method!==drafts[index]?.method){const key=String(drafts[index].key);setRowMoney(values=>({...values,[key]:null}));setRowBanks(values=>({...values,[key]:null}));}
    setDrafts((current) => current.map((draft, i) => {
      if (i !== index) return draft;
      const currency = change.currencyId ? currencies.find((item) => item.currency_id === Number(change.currencyId)) : null;
      return { ...draft, ...change, ...(currency ? { rate: currency.is_base ? '1' : '' } : {}) };
    })); clearMessage();
  };
  const addChecks = () => {
    const count = Number(checksToAdd);
    if (!Number.isSafeInteger(count) || count < 1 || count+drafts.length>100) {
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
    if (submitting.current || loading || loadError || (voucherDocument && !voucherDocument.can_edit)) return;
    if (!validCheckBusinessDate(journalDate)) {setError('اختر تاريخ سند صالحًا.');return;}
    if (type === 'Journal') {
      if (lines.length < 2 || lines.some((line) => !line.account_id || !validAmount(line.amount) || !manualAccounts.some((account) => account.kind==='General' && account.account_id === line.account_id)) || !balanced) {
        setError('أكمل أطراف القيد بمبالغ صحيحة وتأكد من تساوي المدين والدائن.'); return;
      }
      const net = new Map<number, number>();
      for (const line of lines) net.set(line.account_id!, (net.get(line.account_id!) ?? 0) + (line.side === 'debit' ? cents(line.amount) : -cents(line.amount)));
      if ([...net.values()].every(amount => amount === 0)) { setError('لا يمكن تسجيل تحويل بلا أثر بين الحسابات. اختر حسابين مختلفين.'); return; }
      if (!journalDate) { setError('اختر تاريخ القيد.'); return; }
      const input: VoucherInput = { type, occurred_at: journalDate, notes: journalNotes.trim(), lines: lines.map((line) => ({ account_id: line.account_id!, [line.side]: Number(line.amount) })) };
      const summary = `سند قيد بقيمة ${formatMoney(debitCents / 100, baseCurrency)}\n${lines.map((line) => `${line.side === 'debit' ? 'مدين' : 'دائن'}: ${accounts.find((account) => account.account_id === line.account_id)?.name} — ${formatMoney(line.amount, baseCurrency)}`).join('\n')}`;
      setPending({ kind: 'journal', input, summary });
      return;
    }
    if (!selectedAccount && drafts.some(d=>!rowAccounts[String(d.key)])) { setError('اختر الحساب المقابل.'); return; }
    if (!drafts.length) { setError('أضف سطر قبض أو صرف واحدًا على الأقل.'); return; }
    if (!baseCurrency) { setError('العملة الأساسية غير محددة. تحقق من إعدادات العملات.'); return; }
    const cashAccount = cashChoices.find((account) => account.account_id === cashId);
    const bankAccount = manualAccounts.find((account) => account.account_id === bankId);
    if (selectedAccount && hasCheck && (selectedAccount.is_system || !['General'].includes(selectedAccount.kind))) { setError('اختر حسابًا عامًا للشيك.'); return; }
    if (hasCash && !cashAccount && drafts.some(d=>d.method==='Cash'&&!rowMoney[String(d.key)])) { setError('الصندوق الرئيسي غير متاح؛ راجع إعداد الصندوق قبل اعتماد النقد.'); return; }
    if (type === 'Disbursement' && hasCheck && bankAccount?.kind !== 'Bank' && drafts.some(d=>d.method==='Check'&&!rowBanks[String(d.key)])) { setError('اختر البنك الذي يُسحب منه مبلغ الشيك.'); return; }
    const transferBank = transferBanks.find(account => account.account_id === transferBankId);
    if (hasTransfer && !transferBank && drafts.some(d=>d.method==='BankTransfer'&&!rowMoney[String(d.key)])) { setError('اختر بنك الحوالة البنكية.'); return; }
    const steps: BatchStep[] = [];
    for (const [index, draft] of drafts.entries()) {
      const currency = currencies.find((item) => item.currency_id === Number(draft.currencyId));
      if(!validAmount(draft.amount)){setError(`أدخل مبلغًا أكبر من صفر بمنزلتين عشريتين كحد أقصى في الدفعة ${index+1}.`);return;}
      if(!currency?.is_active){setError(`اختر عملة نشطة للدفعة ${index+1}.`);return;}
      if(!currency.is_base&&(!/^\d+(?:\.\d{1,6})?$/.test(draft.rate.trim())||Number(draft.rate)<=0)){setError(`أدخل سعر صرف أكبر من صفر للدفعة ${index+1}.`);return;}
      const rate = currency?.is_base ? 1 : Number(draft.rate);
      const amountInBaseCents = convertedCents(draft.amount, currency?.is_base ? '1' : draft.rate);
      if (!currency || amountInBaseCents === null) {
        setError(`راجع المبلغ والعملة وسعر الصرف في السطر ${index + 1}.`); return;
      }
      const notes = draft.notes.trim() || undefined;
      if (draft.method === 'Check') {
        const checkError = requiredCheckInputError({...draft,paidAt:journalDate});
        if (checkError) { setError(`${checkError} السطر ${index + 1}.`); return; }
      }
      {
        const input: CreatePaymentDto = {
          amount: Number(draft.amount), currency_id: currency.currency_id, exchange_rate: rate,
          payment_method: draft.method, paid_at: journalDate,
          notes,
          ...(draft.method === 'BankTransfer' ? { money_account_id: rowMoney[String(draft.key)] ?? transferBank!.account_id } : {}),
          ...(draft.method === 'Cash' ? { money_account_id: rowMoney[String(draft.key)] ?? cashAccount!.account_id } : {}),
          ...(draft.method === 'Check' ? { check: {
            check_number: draft.checkNumber.trim(), account_number: draft.accountNumber.trim(),
            bank_number: draft.bankNumber.trim(), branch_number: draft.branchNumber.trim(),
            due_date: draft.dueDate,
          }, ...(type === 'Disbursement' ? { bank_account_id: rowBanks[String(draft.key)] ?? bankId! } : {}) } : {}),
        };
        steps.push({ key: draft.key, accountId: rowAccounts[String(draft.key)] ?? selectedAccount!.account_id, type, input });
      }
    }
    const details = drafts.map((draft, index) => {
      const currency = currencies.find((item) => item.currency_id === Number(draft.currencyId))!;
      const base = convertedCents(draft.amount, currency.is_base ? '1' : draft.rate)! / 100;
      return `${index + 1}. ${draft.method === 'Check' ? 'شيك' : draft.method === 'BankTransfer' ? 'حوالة بنكية' : 'نقد'}: ${draft.amount} ${currency.code}${currency.is_base ? '' : ` × ${draft.rate} = ${formatMoney(base, baseCurrency)}`}`;
    }).join('\n');
    const cashLocation = hasCash ? `\n${type === 'Receipt' ? 'صندوق الاستلام' : 'صندوق الدفع'}: ${cashAccount?.name}` : '';
    const checkBank = hasCheck ? (type === 'Disbursement' ? `\nالبنك الذي يُسحب منه مبلغ الشيك: ${bankAccount?.name}` : '\nوجهة الشيكات: صندوق الشيكات') : '';
    const summary = `${type === 'Receipt' ? 'سند قبض' : 'سند صرف'} — ${selectedAccount?.name ?? 'حسابات متعددة'}\n${steps.length} سطر، منها ${drafts.filter((draft) => draft.method === 'Check').length} شيك${cashLocation}${checkBank}${hasTransfer ? `\nبنك الحوالة: ${transferBank?.name}` : ''}\n${details}\nالإجمالي بالعملة الأساسية: ${formatMoney(total, baseCurrency)}`;
    setPending({ kind: 'batch', steps, summary });
  };

  const save = async () => {
    if (!pending || submitting.current) return;
    submitting.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      const input: FinancialVoucherInput = pending.kind === 'journal'
        ? { type:'Journal', business_date:journalDate, notes:pending.input.notes, lines:pending.input.lines.map((line,index)=>({line_id:lines[index].line_id ?? 'j'+lines[index].key,account_id:line.account_id,debit:line.debit??0,credit:line.credit??0})) }
        : { type:pending.steps[0].type, business_date:journalDate, notes:journalNotes, payments:pending.steps.map(step=>({...step.input,line_id:String(step.key),account_id:step.accountId})) };
      const result = voucherDocument ? await financialVouchersService.edit(voucherDocument.financial_voucher_id,{...input,revision:voucherDocument.revision}) : await financialVouchersService.create(input);
      setDocument(result);setSuccess('حُفظ السند '+result.voucher_number+' بنجاح.'); setSuccessHasChecks(result.payments.some(p=>p.managed_checks));setPending(null);
    } catch (reason) {
      setPending(null);setError(apiMessages(reason,'تعذر حفظ السند كاملاً.').join('، '));
    } finally { submitting.current=false;setSaving(false); }
  };
  const openVoucher = useCallback(async (id:number) => {
    if(submitting.current) return;submitting.current=true;setSaving(true);setError('');
    try {
      setDocument(null);setError('');
      const value=await financialVouchersService.get(id);setDocument(value);setType(value.input.type);setJournalDate(value.input.business_date);setJournalNotes(value.input.notes??'');
      if(value.input.type==='Journal') setLines(value.input.lines!.map((r,index)=>({key:index+1,line_id:r.line_id,account_id:r.account_id,side:r.debit>0?'debit':'credit',amount:String(r.debit||r.credit)})));
      else {
        setDrafts(value.input.payments!.map(r=>({...newDraft(r.line_id,String(r.currency_id)),key:r.line_id,amount:String(r.amount),rate:String(r.exchange_rate),method:r.payment_method,paidAt:value.input.business_date,notes:r.notes??'',checkNumber:r.check?.check_number??'',accountNumber:r.check?.account_number??'',bankNumber:r.check?.bank_number??'',branchNumber:r.check?.branch_number??'',dueDate:r.check?.due_date??''})));
        setRowBanks(Object.fromEntries(value.input.payments!.map(r=>[r.line_id,r.bank_account_id??null])));
        setRowAccounts(Object.fromEntries(value.input.payments!.map(r=>[r.line_id,r.account_id])));setRowMoney(Object.fromEntries(value.input.payments!.map(r=>[r.line_id,r.money_account_id??r.cash_account_id??null])));
        setAccountId(value.input.payments![0].account_id);setBankId(value.input.payments!.find(r=>r.bank_account_id)?.bank_account_id??null);
      }
      nextLineKey.current=Math.max(3,(value.input.lines?.length??0)+1);nextKey.current=Math.max(0,...(value.input.payments??[]).map(r=>Number(r.line_id)||0))+1;
    } catch(reason) {setError(apiMessages(reason,'تعذر فتح السند.').join('، '));} finally{submitting.current=false;setSaving(false);}
  },[]);
  const linkedVoucher=Number(params.get('voucher'));
  useEffect(()=>{if(linkedVoucher>0&&!loading&&!loadError)void openVoucher(linkedVoucher)},[linkedVoucher,loading,loadError,openVoucher]);
  useEffect(()=>{if(!preselected)return;const c=new AbortController();accountsService.get(preselected,c.signal).then(a=>{if(!c.signal.aborted)resolveAccount(a)}).catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'الحساب غير متاح').join('، '))});return()=>c.abort()},[preselected,resolveAccount]);
  const cancelVoucher = async () => {
    if(!voucherDocument||submitting.current)return;
    submitting.current=true;setSaving(true);setError('');
    try {setDocument(await financialVouchersService.cancel(voucherDocument.financial_voucher_id,voucherDocument.revision));setCancelOpen(false);setSuccess('تم إلغاء السند كاملاً.');}catch(reason){setError(apiMessages(reason,'تعذر إلغاء السند.').join('، '));}finally{submitting.current=false;setSaving(false);}
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
        <AccountPicker remote onResolved={resolveAccount} accounts={manualAccounts.filter(a=>a.kind==='General')} kinds={['General']} label={`حساب ${label} ${index + 1} (مطلوب)`} value={line.account_id} onChange={(id) => editLine(line.key, { account_id: id })} disabled={loading || !!loadError} compact showIdentity />
        <label className="block min-w-0"><span className="sr-only">مبلغ حساب {label} {index + 1}</span><input className="rep-control text-left" dir="ltr" inputMode="decimal" required aria-label={`مبلغ حساب ${label} ${index+1} (مطلوب)`} placeholder="0.00" value={line.amount} onChange={(event) => editLine(line.key, { amount: event.target.value })} /></label>
        <button type="button" aria-label={`إزالة حساب ${label} ${index + 1}`} title="إزالة الحساب" className="grid h-10 w-10 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-300" disabled={sideLines.length <= 1} onClick={() => { setLines((current) => current.filter((row) => row.key !== line.key)); clearMessage(); }}><Trash2 className="h-4 w-4" /></button>
      </div>)}</div>
      <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 text-sm font-black text-brand"><span>إجمالي {label}</span><span>{formatMoney((side === 'credit' ? creditCents : debitCents) / 100, baseCurrency)}</span></div>
    </div>;
  };

  return <div className="vouchers-page mx-auto min-w-0 w-full max-w-none space-y-4 p-4 sm:p-6" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5"><div><p className="text-xs font-bold text-gold-dark">الدفتر المالي</p><h1 className="text-3xl font-black text-brand">السندات</h1><p className="mt-1 text-sm text-stone-500">نقد أو شيك لكل سطر. بيانات الشيكات وحالاتها في {admin?<Link to="/owner/checks" className="font-bold text-gold-dark underline">صفحة الشيكات</Link>:'صفحة الشيكات'}.</p></div></header>
    <div role="group" aria-label="نوع السند" className="grid grid-cols-3 gap-1 rounded-xl border bg-stone-100 p-1">
      {([['Receipt', 'سند قبض'], ['Disbursement', 'سند صرف'], ['Journal', 'سند قيد']] as const).map(([value, label]) =>
        <button key={value} type="button" disabled={!!voucherDocument || saving} aria-pressed={type === value} className={`min-h-11 rounded-xl px-2 py-2 text-center text-sm font-black transition sm:text-base ${type === value ? 'bg-white text-brand shadow-sm ring-1 ring-gold/60' : 'text-stone-600 hover:bg-white/70'}`} onClick={() => { setType(value); clearMessage(); }}>{label}</button>)}
    </div>
    {loadError && <div className="rep-error" role="alert">{loadError} <button type="button" className="mr-2 underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p className="text-sm text-stone-500" role="status">جارٍ تحميل الحسابات والعملات…</p>}
    {!loading && !loadError && !manualAccounts.length && <p role="status" className="rep-section p-4 text-sm text-stone-500">لا توجد حسابات متاحة. أنشئ حسابًا أولًا من صفحة الحسابات.</p>}

    {voucherDocument&&<section className="space-y-3 rounded-xl border bg-white p-3">{voucherDocument&&<div className="space-y-2"><p className="font-bold">{voucherDocument.voucher_number} · {voucherDocument.status==='Cancelled'?'ملغى':'فعال'} · النسخة {voucherDocument.revision}</p>{voucherDocument.blocked_reason&&<p role="alert" className="text-red-600">{voucherDocument.blocked_reason}</p>}<ul>{voucherDocument.payments.map(p=><li key={p.payment_id}>دفعة {p.payment_id}{p.managed_checks&&' · شيك '+p.managed_checks.number+' #'+p.managed_checks.managed_check_id+' · '+(locationLabels[p.managed_checks.location as keyof typeof locationLabels]??'غير محدد')}</li>)}</ul>{admin&&<button className="btn-outline text-red-600" disabled={saving||!voucherDocument.can_cancel} onClick={()=>setCancelOpen(true)}>إلغاء السند كاملاً</button>}<details><summary>سجل السند</summary>{voucherDocument.history.map((h,index)=><details key={h.audit_log_id} className="rounded-lg border p-3"><summary>{h.action==='FinancialVoucherCreated'?'إنشاء':h.action==='FinancialVoucherEdited'?'تصحيح':'إلغاء'} · النسخة {h.after_data?.revision??index+1} · المستخدم #{h.actor_user_id} · {h.created_at}</summary><p>{h.after_data?.input?.business_date} · {h.after_data?.input?.notes}</p><ul>{h.after_data?.input?.payments?.map(row=><li key={row.line_id}>{accountLabel(row.account_id)} · {row.amount} · {row.payment_method==='Check'?'شيك '+row.check?.check_number:row.payment_method==='Cash'?'نقد':'حوالة بنكية'} · الدفعة {h.after_data?.payment_ids?.[row.line_id]}</li>)}{h.after_data?.input?.lines?.map(row=><li key={row.line_id}>{accountLabel(row.account_id)} · مدين {row.debit} · دائن {row.credit}</li>)}</ul></details>)}</details></div>}</section>}
    <form onSubmit={submit} className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        {type === 'Journal' ? <div className="space-y-4">
          <div className="border-b border-stone-100 pb-4"><h2 className="font-black text-brand">أطراف القيد</h2><p className="text-xs text-stone-500">اختر الحساب العام والمبلغ لكل طرف. يجب أن يتساوى مجموع المدين والدائن.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">{renderJournalColumn('credit')}{renderJournalColumn('debit')}</div>
          <div className="flex flex-wrap gap-6 rounded-xl bg-brand-50 p-3 text-sm font-bold text-brand" aria-live="polite"><span className={accountAmountColor(String(debitCents / 100), 'debit')}>المدين: {formatMoney(debitCents / 100, baseCurrency)}</span><span className={accountAmountColor(String(creditCents / 100), 'credit')}>الدائن: {formatMoney(creditCents / 100, baseCurrency)}</span><span className={balanced ? 'text-emerald-700' : 'text-red-700'}>{balanced ? 'القيد متوازن' : `الفرق: ${formatMoney(Math.abs(debitCents - creditCents) / 100, baseCurrency)}`}</span></div>
          <div className="grid max-w-4xl items-start gap-4 sm:grid-cols-[220px_minmax(0,1fr)]"><RepDateInput label="تاريخ القيد (مطلوب)" value={journalDate} onChange={setJournalDate} /><label className="block min-w-0"><span className="rep-label">سبب القيد (اختياري)</span><textarea className="rep-control" rows={2} value={journalNotes} onChange={(event) => { setJournalNotes(event.target.value); clearMessage(); }} /></label></div>
        </div> : <div className="min-w-0 space-y-5"><div className="space-y-3"><div className="min-w-0">
          <AccountPicker remote onResolved={resolveAccount} accounts={manualAccounts} kinds={['General']} label={(type === 'Receipt' ? 'المقبوض منه' : 'المدفوع له') + ' (مطلوب)'} exclude={treasuryAccountIds} value={accountId} onChange={(id) => { setAccountId(id); clearMessage(); }} disabled={loading || !!loadError} showIdentity /></div>
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            {hasTransfer && <section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 p-3"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-bold text-brand">الحوالات البنكية</h2><span className="text-sm font-bold text-brand">{formatMoney(methodTotal('BankTransfer'), baseCurrency)}</span></div><AccountPicker remote onResolved={resolveAccount} accounts={transferBanks} label={type === 'Receipt' ? 'بنك استلام الحوالة (مطلوب)' : 'بنك دفع الحوالة (مطلوب)'} kinds={['Bank']} value={transferBankId} onChange={id => { setTransferBankId(id); clearMessage(); }} disabled={loading || !!loadError} showIdentity /></section>}
            {(hasCash||(hasCheck&&type==='Receipt'))&&<div className="inline-flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1.5 rounded-full border border-brand/10 bg-brand-50 px-3 py-1.5 text-brand"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand/60"/><span>{type==='Receipt'?'الاستلام في الصندوق الرئيسي تلقائيًا':'النقد من الصندوق الرئيسي تلقائيًا'}</span></span>{hasCash&&!cashId&&<span role="status" className="text-red-700">الصندوق غير متاح؛ راجع المسؤول.</span>}</div>}
            {hasCheck&&type==='Disbursement'&&<section className="min-w-0 rounded-xl border border-stone-200 bg-stone-50/60 p-3"><AccountPicker remote onResolved={resolveAccount} accounts={manualAccounts} label="البنك الذي يُسحب منه مبلغ الشيك (مطلوب)" kinds={['Bank']} value={bankId} onChange={(id)=>{setBankId(id);clearMessage();}} disabled={loading||!!loadError} showIdentity/></section>}
          </div>
          </div><div className="min-w-0 space-y-4"><div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-brand">جدول الدفعات</h2><p className="text-xs text-stone-500">حدّد طريقة الدفع والمبلغ والعملة لكل دفعة.</p></div><button type="button" className="btn-outline" onClick={() => { setDrafts((current) => [...current, newDraft(nextKey.current++, String(baseCurrency?.currency_id ?? ''))]); clearMessage(); }}><Plus className="h-4 w-4" /> إضافة دفعة</button></div><PaymentDraftTable documentDate={journalDate} onDocumentDateChange={setJournalDate} scrollable rows={drafts} currencies={currencies} onChange={editDraft} onRemove={(index) => { setDrafts((current) => current.filter((_, i) => i !== index)); clearMessage(); }} /></div>
<details open={!!journalNotes}><summary className="cursor-pointer text-sm font-semibold text-brand">ملاحظات السند (اختياري)</summary><label className="mt-2 block"><span className="sr-only">ملاحظات السند</span><textarea rows={2} className="rep-control" placeholder="أضف ملاحظة عند الحاجة" value={journalNotes} onChange={e=>setJournalNotes(e.target.value)}/></label></details>          <div className="flex flex-wrap items-center gap-2"><div className="flex items-center overflow-hidden rounded-lg border border-brand/15 bg-white"><input aria-label="عدد الشيكات المراد إضافتها" className="h-11 w-16 border-0 px-2 text-center text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold" type="number" min="1" value={checksToAdd} onChange={(event) => setChecksToAdd(event.target.value)} /><button type="button" className="inline-flex min-h-11 items-center gap-2 bg-brand-50 px-3 text-xs font-black text-brand hover:bg-brand-100" onClick={addChecks}><CopyPlus className="h-4 w-4" /> إضافة شيكات</button></div><span className="text-xs text-stone-500">تُنسخ بيانات آخر شيك مع زيادة الرقم والاستحقاق، بحد أقصى 100 سطر للسند.</span></div>
          <div className="rounded-xl bg-brand-50 p-3 font-black text-brand">الإجمالي بالعملة الأساسية: {formatMoney(total, baseCurrency)}</div></div>
        </div>}
      </section>
      {error && <div ref={errorRegion} tabIndex={-1} className="rep-error scroll-mt-24 outline-none" role="alert">{error}</div>}
      <div className="flex justify-end"><button type="submit" className="btn-primary min-w-36" disabled={saving || loading || !!loadError || !accounts.length || !!voucherDocument&&!voucherDocument.can_edit}>{saving ? 'جارٍ الاعتماد…' : 'اعتماد السند'}</button></div>
    </form>



    <ConfirmDialog open={cancelOpen} onClose={()=>setCancelOpen(false)} loading={saving} title="إلغاء السند كاملاً" message="ستُعكس جميع أسطر السند مع حفظ سجلها. إذا منع شيك الإلغاء فسيُرفض السند كله." onConfirm={()=>void cancelVoucher()}/>
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
              const location= input.payment_method==='BankTransfer' ? transferBanks.find(account=>account.account_id===input.money_account_id)?.name : input.payment_method==='Cash' ? accounts.find(account=>account.account_id===input.money_account_id)?.name : step.type==='Receipt' ? 'صندوق الشيكات' : accounts.find(account=>account.account_id===input.bank_account_id)?.name;
              return <li key={step.key} className="min-w-0 rounded-xl bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold">{index+1}. {input.payment_method==='Check'?'شيك':input.payment_method==='BankTransfer'?'حوالة بنكية':'نقد'}</span><b dir="ltr" className="text-base tabular-nums">{formatMoney(input.amount,currency)}</b></div>
                <p className="mt-1 text-sm font-bold">{accountLabel(step.accountId)}</p><p className="mt-2 break-words text-sm"><span className="text-stone-500">{input.payment_method==='BankTransfer' ? 'بنك الحوالة: ' : input.payment_method==='Cash' ? step.type==='Receipt'?'صندوق الاستلام: ':'صندوق الصرف: ' : step.type==='Receipt'?'الوجهة: ':'البنك المسحوب منه: '}</span>{location}</p>
                {input.check && <p className="mt-1 break-words text-xs text-stone-500">رقم الشيك: {input.check.check_number} · الاستحقاق: {input.check.due_date}</p>}
                {currency && !currency.is_base && <p className="mt-1 text-xs text-stone-500">سعر الصرف: {input.exchange_rate} · بالعملة الأساسية: {formatMoney(convertedCents(String(input.amount),String(input.exchange_rate))! / 100,baseCurrency)}</p>}
              </li>;
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 p-4"><span className="text-sm font-bold">الإجمالي بالعملة الأساسية</span><strong dir="ltr" className="text-xl tabular-nums">{formatMoney(pending.steps.reduce((sum,step)=>sum+(convertedCents(String(step.input.amount),String(step.input.exchange_rate))??0),0)/100,baseCurrency)}</strong></div>
          <p className="text-xs text-stone-500">كل الأسطر تُحفظ ضمن سند واحد؛ تنجح معاً أو تُرفض معاً.</p>
        </>}
        {pending?.kind === 'journal' && <>
          <p className="text-sm text-stone-500">راجع أطراف القيد قبل الاعتماد.</p>
          <div className="grid gap-3 sm:grid-cols-2">{(['debit','credit'] as const).map(side=><section key={side} className="min-w-0 rounded-xl border border-stone-200 p-3"><h3 className="mb-3 text-sm font-bold">{side==='debit'?'المدين':'الدائن'}</h3><ul className="space-y-3">{pending.input.lines.filter(line=>line[side]).map((line,index)=><li key={index} className="min-w-0 border-t border-stone-100 pt-2"><p className="break-words text-sm">{accountLabel(line.account_id)}</p><b dir="ltr" className={'mt-1 block text-right tabular-nums ' + accountAmountColor(String(line[side]!), side)}>{formatMoney(line[side]!,baseCurrency)}</b></li>)}</ul><p className={'mt-3 border-t pt-3 text-sm font-bold ' + accountAmountColor(String(pending.input.lines.reduce((sum,line)=>sum+(line[side]??0),0)), side)}>الإجمالي: {formatMoney(pending.input.lines.reduce((sum,line)=>sum+(line[side]??0),0),baseCurrency)}</p></section>)}</div>
          <p className="whitespace-pre-wrap break-words text-sm text-stone-500">{pending.input.notes}</p>
        </>}
      </div>
    </Modal>
  </div>;
}
