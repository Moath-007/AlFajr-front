import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { currenciesService, accountsService, paymentsService, type AccountIdentityOption, type CreatePaymentDto, type CurrencyDto, type SaleAccountOption } from '@/api';
import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { formatMoney } from '@/utils/money';
import AccountPicker from './AccountPicker';
import GeneralSaleAccountSelect from '@/components/orders/GeneralSaleAccountSelect';
import { useGeneralSaleAccounts } from '@/components/orders/useGeneralSaleAccounts';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { businessToday } from './accountUiUtils';

type PaymentType = 'Receipt' | 'Disbursement';
type PaymentMethod = 'Cash' | 'Check';
const validAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;
const validRate = (value: string) => /^\d+(?:\.\d{1,6})?$/.test(value.trim()) && Number(value) > 0;

export default function AccountPaymentsPage() {
  const { user } = useAuth();
  const admin = user?.role === 'Admin';
  const [params] = useSearchParams();
  const inFlight = useRef(false);
  const [type, setType] = useState<PaymentType>('Receipt');
  const [counterparty, setCounterparty] = useState<SaleAccountOption | null>(null);
  const generalAccounts = useGeneralSaleAccounts();
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [currencyId, setCurrencyId] = useState('');
  const [currencyError, setCurrencyError] = useState('');
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyRevision, setCurrencyRevision] = useState(0);
  const [cashAccounts, setCashAccounts] = useState<AccountIdentityOption[]>([]);
  const [accounts, setAccounts] = useState<AccountIdentityOption[]>([]);
  const [cashError, setCashError] = useState('');
  const [bankError, setBankError] = useState('');
  const [accountRevision, setAccountRevision] = useState(0);
  const [cashAccountId, setCashAccountId] = useState<number | null>(null);
  const [bankId, setBankId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('1');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paidAt, setPaidAt] = useState(businessToday);
  const [pending, setPending] = useState<CreatePaymentDto | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCurrencyLoading(true);
    currenciesService.list(controller.signal).then((response) => {
      const rows = Array.isArray(response) ? response : response.items ?? response.currencies ?? [];
      const active = rows.filter((item) => item.is_active);
      setCurrencies(active);
      setCurrencyId((current) => active.some((item) => String(item.currency_id) === current)
        ? current : String((active.find((item) => item.is_base) ?? active[0])?.currency_id ?? ''));
      setCurrencyError(active.length ? '' : 'لا توجد عملات فعالة متاحة للدفع.');
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setCurrencyError(apiMessages(reason, 'تعذر تحميل العملات.').join('، '));
    }).finally(() => { if (!controller.signal.aborted) setCurrencyLoading(false); });
    return () => controller.abort();
  }, [currencyRevision]);

  useEffect(() => {
    const controller = new AbortController();
    accountsService.allOptions({type: 'Cash'}, controller.signal).then((rows) => {
      setCashAccounts(rows); setCashError('');
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setCashError(apiMessages(reason, 'تعذر تحميل الصناديق النقدية.').join('، '));
    });
    accountsService.allOptions({type: 'Bank'}, controller.signal).then((rows) => {
      setAccounts(rows); setBankError('');
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setBankError(apiMessages(reason, 'تعذر تحميل الحسابات البنكية.').join('، '));
    });
    return () => controller.abort();
  }, [admin, accountRevision]);

  useEffect(() => { const id=Number(params.get('account')); const found=generalAccounts.accounts.find(row=>row.id===id); if(found)setCounterparty(found); },[params,generalAccounts.accounts]);

  const currency = currencies.find((row) => row.currency_id === Number(currencyId));
  const baseCurrency = currencies.find((row) => row.is_base);
  const selectedCash = [...cashAccounts, ...accounts].find((row) => row.account_id === cashAccountId);
  const matchingCash = [...cashAccounts, ...accounts];
  const matchingBanks = accounts.filter((row) => row.kind === 'Bank');

  const submit = async () => {
    if (inFlight.current) return;
    if (!counterparty || !currency || !validAmount(amount)) { setError('اختر الحساب والعملة وأدخل مبلغًا صالحًا أكبر من صفر.'); return; }
    if (!currency.is_base && !validRate(rate)) { setError('أدخل سعر صرف صالحًا أكبر من صفر.'); return; }
    if (type === 'Disbursement' && !admin) { setError('سند الصرف متاح للمدير فقط.'); return; }
    if (method === 'Check' && (!checkNumber.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(due))) { setError('رقم الشيك وتاريخ استحقاقه مطلوبان.'); return; }
    if (method === 'Check' && type === 'Disbursement' && !matchingBanks.some((row) => row.account_id === bankId)) {
      setError('اختر حسابًا بنكيًا للشيك الصادر.'); return;
    }
    if (method === 'Cash' && cashAccountId !== null && !selectedCash) {
      setError('اختر صندوقًا نقديًا، أو استخدم الصندوق الافتراضي.'); return;
    }
    const input: CreatePaymentDto = {
      amount: Number(amount), currency_id: currency.currency_id,
      exchange_rate: currency.is_base ? 1 : Number(rate), payment_method: method,
      paid_at: paidAt,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(method === 'Cash' && selectedCash ? { money_account_id: selectedCash.account_id } : {}),
      ...(method === 'Check' ? { check: { check_number: checkNumber.trim(), due_date: due },
        ...(type === 'Disbursement' ? { bank_account_id: bankId! } : {}) } : {}),
    };
    if (!paidAt) { setError('اختر تاريخ السند.'); return; }
    setError(''); setPending(input);
  };

  const save = async () => {
    if (!pending || !counterparty || inFlight.current) return;
    const input = pending;
    const label = type === 'Receipt' ? 'سند قبض' : 'سند صرف';
    inFlight.current = true;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = type === 'Receipt'
        ? await paymentsService.createReceipt(counterparty.id, input)
        : await paymentsService.createDisbursement(counterparty.id, input);
      setNotice(`حُفظ ${label} ${result.voucher_number ?? `#${result.payment_id}`} بنجاح.`);
      setAmount(''); setCheckNumber(''); setDue(''); setNotes('');
      generalAccounts.reload();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 403) setError('ليست لديك صلاحية تنفيذ هذه العملية.');
      else if (reason instanceof ApiError && reason.status === 409) setError('تعارضت العملية مع طلب سابق. ' + apiMessages(reason, 'راجع السند ثم حاول مرة أخرى.').join('، '));
      else setError(apiMessages(reason, 'تعذر حفظ السند.').join('، '));
    } finally { inFlight.current = false; setSaving(false); setPending(null); }
  };

  return <div className="mx-auto max-w-3xl space-y-5" dir="rtl">
    <header className="border-b pb-4"><p className="text-xs font-black text-gold-dark">عملية مالية</p><h1 className="text-3xl font-black text-brand">{admin ? 'قبض وصرف الحسابات' : 'سند قبض'}</h1><p className="text-sm text-stone-500">اختر الحساب داخل النموذج. القبض منفصل عن البيع والشراء.</p></header>
    <div className={`grid gap-2 ${admin ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <button type="button" className={`rounded-xl border p-4 font-black ${type === 'Receipt' ? 'border-gold-dark bg-amber-50' : 'bg-white'}`} onClick={() => { setType('Receipt'); setMethod('Cash'); setError(''); }}>سند قبض</button>
      {admin && <button type="button" className={`rounded-xl border p-4 font-black ${type === 'Disbursement' ? 'border-gold-dark bg-amber-50' : 'bg-white'}`} onClick={() => { setType('Disbursement'); setMethod('Cash'); setError(''); }}>سند صرف</button>}
    </div>
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <GeneralSaleAccountSelect accounts={generalAccounts.accounts} value={counterparty?.id ?? null} onChange={id => setCounterparty(generalAccounts.accounts.find(row=>row.id===id) ?? null)} loading={generalAccounts.loading} error={generalAccounts.error} onRetry={generalAccounts.reload} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="rep-label">تاريخ السند</span><input className="rep-control" type="date" value={paidAt} onChange={event => setPaidAt(event.target.value)} disabled={saving} /></label>
        <label><span className="rep-label">المبلغ</span><input className="rep-control" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={saving} /></label>
        <label><span className="rep-label">العملة</span><select className="rep-control" value={currencyId} onChange={(event) => { setCurrencyId(event.target.value); setRate(''); setBankId(null); setCashAccountId(null); }} disabled={currencyLoading || saving}><option value="">اختر العملة</option>{currencies.map((row) => <option key={row.currency_id} value={row.currency_id}>{row.name} ({row.code})</option>)}</select></label>
        {!currency?.is_base && <label><span className="rep-label">سعر الصرف إلى {baseCurrency?.name ?? 'العملة الأساسية'}</span><input className="rep-control" type="number" min="0.000001" step="0.000001" value={rate} onChange={(event) => setRate(event.target.value)} disabled={saving} /></label>}
        <label><span className="rep-label">طريقة الدفع</span><select className="rep-control" value={method} onChange={(event) => { setMethod(event.target.value as PaymentMethod); setError(''); }} disabled={saving}><option value="Cash">نقد</option><option value="Check">شيك</option></select></label>
      </div>
      {method === 'Cash' && <div className="space-y-1"><label className="block"><span className="rep-label">حساب {type === 'Receipt' ? 'الاستلام' : 'الدفع'}</span><select className="rep-control" value={cashAccountId ?? ''} onChange={(event) => setCashAccountId(event.target.value ? Number(event.target.value) : null)} disabled={saving}><option value="">الصندوق الافتراضي</option>{matchingCash.map((row) => <option key={row.account_id} value={row.account_id}>{row.account_number} — {row.name} ({row.kind === 'Bank' ? 'بنك' : 'نقد'})</option>)}</select></label><p className="text-xs text-stone-500">اختر Cash أو Bank؛ الأسماء المعروضة لا تتضمن أرصدة.</p>{(cashError || bankError) && <p className="text-xs text-amber-800">{cashError || bankError} <button type="button" className="underline" onClick={() => setAccountRevision(value => value + 1)}>إعادة المحاولة</button></p>}</div>}
      {method === 'Check' && <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="rep-label">رقم الشيك</span><input className="rep-control" value={checkNumber} onChange={(event) => setCheckNumber(event.target.value)} disabled={saving} /></label>
        <label><span className="rep-label">الاستحقاق</span><input className="rep-control" type="date" value={due} onChange={(event) => setDue(event.target.value)} disabled={saving} /></label>
        {type === 'Disbursement' && admin && <div><AccountPicker accounts={matchingBanks} label="البنك المسحوب عليه" kinds={['Bank']} value={bankId} onChange={setBankId} disabled={saving || !!bankError} />{bankError && <p className="mt-1 text-xs text-amber-800">{bankError} <button type="button" className="underline" onClick={() => setAccountRevision((value) => value + 1)}>إعادة المحاولة</button></p>}</div>}
      </div>}
      <label className="block"><span className="rep-label">ملاحظات</span><textarea className="rep-control" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={saving} /></label>
      <p className="text-xs text-stone-500">{type === 'Receipt' ? 'سند القبض يخفض المستحق لنا على الحساب أو يزيد ما ندين به له.' : 'سند الصرف يخفض ما ندين به للحساب أو يزيد المستحق لنا عليه.'}</p>
    </section>
    {currencyError && <div className="rep-error" role="alert">{currencyError} <button type="button" className="underline" onClick={() => setCurrencyRevision((value) => value + 1)}>إعادة المحاولة</button></div>}
    {error && <div className="rep-error" role="alert">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800" role="status">{notice}</div>}
    <button type="button" className="btn-primary" disabled={saving || currencyLoading || !!currencyError || !currency} onClick={() => void submit()}>{saving ? 'جارٍ الحفظ…' : 'اعتماد السند'}</button>
    <ConfirmDialog open={pending !== null} onClose={() => setPending(null)} onConfirm={() => void save()} loading={saving} severity="normal" title={type === 'Receipt' ? 'اعتماد سند قبض' : 'اعتماد سند صرف'} message={`الحساب: ${counterparty?.name ?? ''}، المبلغ: ${formatMoney(pending?.amount ?? 0, currency)}، التاريخ: ${paidAt}`} confirmLabel="تأكيد الحفظ" />
  </div>;
}
