import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService, type LedgerAccount, type TreasuryOverview } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { RefreshCw, ChevronLeft, Wallet, Landmark, Clock3, Files } from 'lucide-react';
import './TreasuryPage.css';
import { formatMoney } from '@/utils/money';

const cents = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) => formatMoney(value / 100);
const accountLink = (id: number) => `/owner/accounts/${id}`;

export default function TreasuryPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{from?: string; to?: string}>({});
  const [treasury, setTreasury] = useState<TreasuryOverview | null>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    const version = ++requestVersion.current;
    const current = () => version === requestVersion.current && !signal?.aborted;
    setLoading(true);
    setError('');
    setTreasury(null);
    setAccounts([]);
    try {
      const [overview, allAccounts] = await Promise.all([ledgerService.treasury(signal, range), ledgerService.accounts(signal)]);
      if (!current()) return;
      setTreasury(overview);
      setAccounts(allAccounts);
    } catch (reason) {
      if (current()) setError(apiMessages(reason, 'تعذر تحميل ملخص الخزنة.').join('، '));
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
    const cashboxes = locations.filter((account) => account.kind === 'Cash');
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
    const externalAccounts = accounts.filter((account) => !account.is_system && (account.kind === 'General'));
    const receivable = externalAccounts.reduce((sum, account) => sum + Math.max(0, -cents(account.balance)), 0);
    const payable = externalAccounts.reduce((sum, account) => sum + Math.max(0, cents(account.balance)), 0);
    const periodTotals = (kind: string) => {
      const items = locations.filter(account => account.kind === kind);
      return { opening: items.reduce((sum,a)=>sum+cents(a.opening_balance ?? '0'),0), incoming: items.reduce((sum,a)=>sum+cents(a.incoming ?? '0'),0), outgoing: items.reduce((sum,a)=>sum+cents(a.outgoing ?? '0'),0) };
    };
    return { periodTotals, cashboxes, banks, holding, pendingByBank, unlinkedPending, cashTotal, bankTotal, pendingTotal, holdingTotal, receivable: treasury?.receivable != null ? cents(treasury.receivable) : receivable, payable: treasury?.payable != null ? cents(treasury.payable) : payable };
  }, [treasury, accounts]);

  return <div className="treasury-page space-y-5" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div>
        <p className="text-xs font-black text-gold-dark">نظرة مالية</p>
        <h1 className="text-3xl font-black text-brand">الخزنة</h1>
        <p className="text-sm text-stone-500">أرصدة الصناديق والبنوك والشيكات والمبالغ المستحقة، بالعملة الأساسية.</p>
      </div>
      <button type="button" className="btn-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} aria-hidden="true" />تحديث</button>
    </header>

    <form className="treasury-range" onSubmit={event=>{event.preventDefault();if(!from || !to || from>to){setError('اختر فترة صحيحة من تاريخ إلى تاريخ.');return;}setRange({from,to});}}>
      <RepDateInput label="من تاريخ" value={from} onChange={setFrom} />
      <RepDateInput label="إلى تاريخ" value={to} min={from || undefined} onChange={setTo} />
      <button className="btn-primary min-h-11" type="submit" disabled={loading}>عرض الفترة</button>
      <button className="btn-outline min-h-11" type="button" disabled={loading} onClick={()=>{setFrom('');setTo('');setRange({});}}>مسح الفترة</button>
    </form>
    <p className="text-xs text-stone-500">{range.from ? 'الأرصدة بنهاية الفترة المختارة، والحركات خلال الفترة.' : 'الأرصدة الحالية حتى الآن، بالعملة الأساسية.'}</p>
    {error && <div className="rep-error" role="alert">{error} <button type="button" className="underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p role="status" className="rounded-xl border bg-white p-5 text-stone-500">جارٍ تحميل ملخص الخزنة…</p>}
    {!loading && treasury && <>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="ملخص الأرصدة">
        <SummaryCard icon={Wallet} title="في الصناديق" value={summary.cashTotal} period={treasury.period ? summary.periodTotals('Cash') : undefined} />
        <SummaryCard icon={Landmark} title="رصيد البنوك المسجّل" value={summary.bankTotal} period={treasury.period ? summary.periodTotals('Bank') : undefined} hint="يشمل ما تم إيداعه أو تحصيله" />
        <SummaryCard icon={Clock3} title="شيكات قيد التحصيل" value={summary.pendingTotal} period={treasury.period ? summary.periodTotals('Clearing') : undefined} />
        <SummaryCard icon={Files} title="شيكات بحوزتنا" value={summary.holdingTotal} period={treasury.period ? summary.periodTotals('CheckHolding') : undefined} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="الصناديق النقدية" link="/owner/accounts?type=Cash&page=1" linkLabel="إدارة الصناديق" />
          {summary.cashboxes.length ? <div className="divide-y">{summary.cashboxes.map((account) => <AccountRow key={account.account_id} name={account.name} balance={cents(account.balance)} id={account.account_id} />)}</div>
            : <EmptyText text="لا توجد صناديق نقدية." />}
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="البنوك" link="/owner/accounts?type=Bank&page=1" linkLabel="إدارة البنوك" />
          {summary.banks.length ? <div className="divide-y">{summary.banks.map((bank) => {
            const posted = cents(bank.balance);
            const pending = summary.pendingByBank.get(bank.account_id) ?? 0;
            return <Link to={accountLink(bank.account_id)} key={bank.account_id} className="treasury-bank-row block p-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black text-brand">{bank.name}</span><span className="text-xs text-stone-500">المسجّل + قيد التحصيل <b className="block text-base text-brand" dir="ltr">{money(posted + pending)}</b></span></div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600"><span>الرصيد المسجّل: <b className="text-brand" dir="ltr">{money(posted)}</b></span><span>قيد التحصيل: <b className="text-amber-800" dir="ltr">{money(pending)}</b></span></div>
            </Link>;
          })}</div> : <EmptyText text="لا توجد حسابات بنكية." />}
          {summary.unlinkedPending !== 0 && <p className="border-t bg-amber-50 px-4 py-2 text-sm text-amber-900">شيكات قيد التحصيل دون بنك مرتبط: <b dir="ltr">{money(summary.unlinkedPending)}</b></p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="الشيكات بحوزتنا" link="/owner/checks" linkLabel="عرض الشيكات" />
          {summary.holding.length ? <div className="divide-y">{summary.holding.map((account) => <AccountRow key={account.account_id} name="خزنة الشيكات" balance={cents(account.balance)} id={account.account_id} to="/owner/checks" />)}</div>
            : <EmptyText text="لا توجد شيكات بحوزتنا." />}
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-brand">أرصدة الحسابات والديون</h2><Link className="text-sm font-bold text-gold-dark underline" to="/owner/accounts">كل الحسابات</Link></div>
          <p className="mt-1 text-xs text-stone-500">مبالغ مستحقة على الحسابات العامة؛ ليست رصيدًا نقديًا.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-sm text-emerald-900">مستحق لنا</p><b className="text-xl text-emerald-950" dir="ltr">{money(summary.receivable)}</b><p className="mt-1 text-xs text-emerald-900">مبالغ لنا لم تُسدّد {treasury.period ? 'حتى نهاية الفترة' : 'حتى الآن'}.</p></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-sm text-amber-900">مستحق علينا</p><b className="text-xl text-amber-950" dir="ltr">{money(summary.payable)}</b><p className="mt-1 text-xs text-amber-900">مبالغ علينا لم نُسدّدها {treasury.period ? 'حتى نهاية الفترة' : 'حتى الآن'}.</p></div>
          </div>
        </div>
      </section>
    </>}
  </div>;
}

function SummaryCard({ title, value, hint, icon: Icon, period }: { title: string; value: number; hint?: string; icon: typeof Wallet; period?: {opening: number; incoming: number; outgoing: number} }) {
  return <div className="treasury-summary rounded-xl border bg-white p-4"><Icon size={20} aria-hidden="true" />{period && <p className="mb-1 text-xs font-bold text-gold-dark">رصيد نهاية الفترة</p>}<p className="text-sm text-stone-600">{title}</p><b className="mt-1 block text-xl text-brand" dir="ltr">{money(value)}</b>{period && <div className="treasury-period-values">{[["رصيد البداية",period.opening,"الموجود قبل بداية الفترة"],["الداخل",period.incoming,"ما دخل خلال الفترة"],["الخارج",period.outgoing,"ما خرج خلال الفترة"]].map(([label,amount,description])=><div key={String(label)}><span>{label}</span><b dir="ltr">{money(Number(amount))}</b><small>{description}</small></div>)}<small>رصيد النهاية: المتبقي بنهاية الفترة.</small></div>}{hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}</div>;
}

function SectionHeading({ title, link, linkLabel }: { title: string; link: string; linkLabel: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-stone-50 px-4 py-3"><h2 className="text-lg font-black text-brand">{title}</h2><Link className="text-sm font-bold text-gold-dark underline" to={link}>{linkLabel}</Link></div>;
}

function AccountRow({ name, balance, id, to }: { name: string; balance: number; id: number; to?: string }) {
  return <Link to={to ?? accountLink(id)} className="treasury-account-row"><span className="font-bold text-brand">{name}</span><b className="text-brand" dir="ltr">{money(balance)}</b><ChevronLeft size={17} aria-hidden="true" /></Link>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="p-4 text-sm text-stone-500">{text}</p>;
}
