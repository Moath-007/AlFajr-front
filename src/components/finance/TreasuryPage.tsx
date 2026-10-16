import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService, type TreasuryOverview } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { RefreshCw, ChevronLeft } from 'lucide-react';
import './TreasuryPage.css';
import { formatMoney } from '@/utils/money';
import { formatOrderDate } from '@/components/rep/repOrderUtils';
import MainCashPanel from './MainCashPanel';
import { accountAmountColor } from './accountUiUtils';

const cents = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) => formatMoney(value / 100);
const accountLink = (id: number) => `/owner/accounts/${id}/statement`;

export default function TreasuryPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{from?: string; to?: string}>({});
  const [treasury, setTreasury] = useState<TreasuryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');
  const requestVersion = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    const current = () => version === requestVersion.current && !signal?.aborted;
    setLoading(true);
    setError('');
    setTreasury(null);
    try {
      const overview = await ledgerService.treasury(signal, range);
      if (!current()) return;
      setTreasury(overview);
    } catch (reason) {
      if (current()) setError(apiMessages(reason, 'تعذر تحميل ملخص الصندوق الرئيسي.').join('، '));
    } finally {
      if (current()) setLoading(false);
    }
  }, [range]);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const summary = useMemo(() => {
    const locations = treasury?.locations ?? [];
    const cashboxes = locations.filter((account) => account.kind === 'Cash' && account.account_id===treasury?.main_cash_account_id);
    const banks = locations.filter((account) => account.kind === 'Bank');
    const holding = locations.filter((account) => account.kind === 'CheckHolding');
    const clearing = locations.filter((account) => account.kind === 'Clearing');
    const bankIds = new Set(banks.map((bank) => bank.account_id));
    const pendingByBank = new Map<number, number>();
    let unlinkedPending = 0;
    for (const account of clearing) {
      if (account.bank_parent_id != null && bankIds.has(account.bank_parent_id)) {
        pendingByBank.set(account.bank_parent_id, (pendingByBank.get(account.bank_parent_id) ?? 0) + cents(account.balance));
      } else {
        unlinkedPending += cents(account.balance);
      }
    }
    const cashTotal = cashboxes.reduce((sum, account) => sum + cents(account.balance), 0);
    const bankTotal = banks.reduce((sum, account) => sum + cents(account.balance), 0);
    const pendingTotal = clearing.reduce((sum, account) => sum + cents(account.balance), 0);
    const holdingTotal = holding.reduce((sum, account) => sum + cents(account.balance), 0);
    const periodTotals = (kind: string) => {
      const items = locations.filter(account => account.kind === kind && (kind!=='Cash'||account.account_id===treasury?.main_cash_account_id));
      return { opening: items.reduce((sum,a)=>sum+cents(a.opening_balance ?? '0'),0), incoming: items.reduce((sum,a)=>sum+cents(a.incoming ?? '0'),0), outgoing: items.reduce((sum,a)=>sum+cents(a.outgoing ?? '0'),0) };
    };
    return { periodTotals, cashboxes, banks, holding, pendingByBank, unlinkedPending, cashTotal, bankTotal, pendingTotal, holdingTotal };
  }, [treasury]);

  const legacyCash = (treasury?.locations ?? []).filter(account =>
    account.kind === 'Cash' && account.account_id !== treasury?.main_cash_account_id &&
    [account.balance, account.opening_balance, account.incoming, account.outgoing].some(value => value != null && cents(value) !== 0),
  );
  const period = Boolean(treasury?.period);
  const periodLabel = range.from && range.to
    ? `${formatOrderDate(range.from)} — ${formatOrderDate(range.to)}`
    : 'الأرصدة الحالية';
  const distribution = [
    { label: 'نقد', value: summary.cashTotal, kind: 'Cash', to: treasury?.main_cash_account_id ? accountLink(treasury.main_cash_account_id) : undefined, action: 'كشف حركة النقد' },
    { label: 'أرصدة البنوك', value: summary.bankTotal, kind: 'Bank', to: '/owner/banks', action: 'تفاصيل البنوك' },
    { label: 'شيكات بحوزتنا', value: summary.holdingTotal, kind: 'CheckHolding', to: '/owner/checks', action: 'عرض الشيكات' },
    { label: 'شيكات قيد التحصيل', value: summary.pendingTotal, kind: 'Clearing', to: '/owner/checks', action: 'متابعة التحصيل' },
  ];

  return <div className="treasury-page" dir="rtl">
    <header className="treasury-header">
      <div><h1 className="text-2xl font-black text-brand">الصندوق الرئيسي</h1></div>
      <button type="button" className="btn-outline min-h-11" onClick={() => void load()} disabled={loading}><RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />تحديث</button>
    </header>

    <form className="treasury-range" aria-label="فترة ملخص الصندوق الرئيسي" onSubmit={event => {
      event.preventDefault();
      if (!from || !to || from > to) { setRangeError('اختر فترة صحيحة من تاريخ إلى تاريخ.'); return; }
      setRangeError(''); setRange({ from, to });
    }}>
      <RepDateInput label="من تاريخ" value={from} max={to || undefined} onChange={value => { setFrom(value); setRangeError(''); }} />
      <RepDateInput label="إلى تاريخ" value={to} min={from || undefined} onChange={value => { setTo(value); setRangeError(''); }} />
      <button className="btn-primary min-h-11" disabled={loading}>عرض الفترة</button>
      <button type="button" className="btn-outline min-h-11" disabled={loading} onClick={() => { setFrom(''); setTo(''); setRangeError(''); setRange({}); }}>الأرصدة الحالية</button>
      {rangeError && <p role="alert" className="treasury-range-error">{rangeError}</p>}
    </form>
    {error && <div className="rep-error" role="alert">{error} <button type="button" className="underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p role="status" className="p-5 text-stone-600">جارٍ تحميل أرصدة الصندوق الرئيسي…</p>}

    {!loading && treasury && <>
      <div className="treasury-applied-period"><span>{period ? 'أرصدة نهاية الفترة' : 'الأرصدة الحالية'}{period && <> · <bdi dir="ltr">{periodLabel}</bdi></>}</span><span>جميع المبالغ بالعملة الأساسية</span></div>

      <div className="treasury-workspace">
      <section className="treasury-section treasury-distribution" aria-labelledby="treasury-distribution-heading">
        <div className="treasury-balance-heading"><div><h2 id="treasury-distribution-heading">إجمالي رصيد الصندوق الرئيسي</h2><Amount value={cents(treasury.total)} prominent /></div></div>
        <div className="treasury-table-scroll" tabIndex={0} role="region" aria-label="توزيع رصيد الصندوق الرئيسي">
          <table className="treasury-table">
            <thead><tr><th scope="col">مكان الأموال</th>{period && <><th scope="col">رصيد بداية الفترة</th><th scope="col">الداخل</th><th scope="col">الخارج</th></>}<th scope="col">{period ? 'رصيد نهاية الفترة' : 'الرصيد الحالي'}</th><th scope="col"><span className="sr-only">التفاصيل</span></th></tr></thead>
            <tbody>
              {distribution.map(row => {
                const totals = summary.periodTotals(row.kind);
                return <tr key={row.kind}><th scope="row">{row.label}</th>{period && <><td><Amount value={totals.opening} /></td><td><Amount value={totals.incoming} /></td><td><Amount value={totals.outgoing} /></td></>}<td><Amount value={row.value} /></td><td>{row.to && <Link className="treasury-text-link" to={row.to}>{row.action}<ChevronLeft size={14} aria-hidden="true" /></Link>}</td></tr>;
              })}
              {legacyCash.map(account => <tr key={account.account_id}><th scope="row">{account.name}<span className="block text-xs font-normal text-stone-500">صندوق سابق · خارج الصندوق الرئيسي</span></th>{period && <><td><Amount value={cents(account.opening_balance ?? '0')} /></td><td><Amount value={cents(account.incoming ?? '0')} /></td><td><Amount value={cents(account.outgoing ?? '0')} /></td></>}<td><Amount value={cents(account.balance)} /></td><td><Link className="treasury-text-link" to={accountLink(account.account_id)}>كشف الحركات<ChevronLeft size={14} aria-hidden="true" /></Link></td></tr>)}
            </tbody>
          </table>
        </div>
        {treasury.cutover_active && treasury.reconciliation_required && <p role="status" className="treasury-reconciliation">توجد أرصدة تحتاج مطابقة. إجمالي التشغيل: <Amount value={cents(treasury.operational_total ?? '0')} /> · أرصدة الصناديق السابقة: <Amount value={cents(treasury.legacy_cash_total ?? '0')} />. الإجمالي يحتفظ بجميع الأرصدة المسجّلة.</p>}
      </section>

      <div className="treasury-sidebar">
      <section className="treasury-section" aria-labelledby="treasury-dues-heading">
        <div className="treasury-section-heading"><h2 id="treasury-dues-heading">لنا وعلينا</h2><Link className="treasury-text-link" to="/owner/reports/account-balances">تفاصيل الأرصدة<ChevronLeft size={14} aria-hidden="true" /></Link></div>
        <dl className="treasury-dues">
          <div><dt>مبالغ مستحقة لنا</dt><dd>{treasury.receivable != null ? <Amount value={cents(treasury.receivable)} neutral /> : 'غير متاح'}</dd></div>
          <div><dt>مبالغ مستحقة علينا</dt><dd>{treasury.payable != null ? <Amount value={cents(treasury.payable)} neutral /> : 'غير متاح'}</dd></div>
        </dl>
        <p className="px-4 pb-3 text-xs leading-5 text-stone-500">{period ? 'أرصدة الحسابات بنهاية الفترة' : 'أرصدة الحسابات الحالية'} · خارج إجمالي الصندوق.</p>
      </section>
      <div className="treasury-opening"><MainCashPanel refreshToken={requestVersion.current} onActivated={() => void load()} /></div>

      <section className="treasury-section" aria-labelledby="treasury-banks-heading">
        <div className="treasury-section-heading"><h2 id="treasury-banks-heading">ملخص البنوك</h2><Link className="treasury-text-link" to="/owner/banks">صفحة البنوك<ChevronLeft size={14} aria-hidden="true" /></Link></div>
        {summary.banks.length > 0 ? <div className="treasury-bank-list">{summary.banks.map(bank => {
          const posted = cents(bank.balance), pending = summary.pendingByBank.get(bank.account_id) ?? 0;
          return <div className="treasury-bank-summary" key={bank.account_id}><Link className="treasury-text-link" to={accountLink(bank.account_id)}>{bank.name}<ChevronLeft size={14} aria-hidden="true" /></Link>{bank.account_number && <bdi dir="ltr" className="text-xs text-stone-500">{bank.account_number}</bdi>}<dl><div><dt>الرصيد المسجّل</dt><dd><Amount value={posted} /></dd></div><div><dt>قيد التحصيل</dt><dd><Amount value={pending} /></dd></div><div><dt>المجموع</dt><dd><Amount value={posted + pending} /></dd></div></dl></div>;
        })}</div> : <p className="px-4 py-3 text-sm text-stone-500">لا توجد حسابات بنكية مسجّلة.</p>}
        {summary.unlinkedPending !== 0 && <p className="treasury-reconciliation">شيكات قيد التحصيل دون بنك مرتبط: <Amount value={summary.unlinkedPending} /></p>}
      </section>
      </div>
      </div>
    </>}
  </div>;
}

function Amount({ value, prominent = false, neutral = false }: { value: number; prominent?: boolean; neutral?: boolean }) {
  const color = neutral ? 'text-stone-700' : accountAmountColor(String(value), value < 0 ? 'debit' : 'credit');
  return <bdi dir="ltr" className={`treasury-amount${prominent ? ' treasury-amount-prominent' : ''} ${color}`}>{money(value)}</bdi>;
}
