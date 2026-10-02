import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ledgerService, type LedgerAccount, type TreasuryOverview } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { formatMoney } from '@/utils/money';

const cents = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) => formatMoney(value / 100);
const accountLink = (id: number) => `/owner/accounts/${id}`;

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<TreasuryOverview | null>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setTreasury(null);
    setAccounts([]);
    try {
      const [overview, allAccounts] = await Promise.all([ledgerService.treasury(), ledgerService.accounts()]);
      setTreasury(overview);
      setAccounts(allAccounts);
    } catch (reason) {
      setError(apiMessages(reason, 'تعذر تحميل ملخص الخزنة.').join('، '));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

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
    const receivable = externalAccounts.reduce((sum, account) => sum + Math.max(0, cents(account.balance)), 0);
    const payable = externalAccounts.reduce((sum, account) => sum + Math.max(0, -cents(account.balance)), 0);
    return { cashboxes, banks, holding, pendingByBank, unlinkedPending, cashTotal, bankTotal, pendingTotal, holdingTotal, receivable, payable };
  }, [treasury, accounts]);

  return <div className="space-y-5" dir="rtl">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
      <div>
        <p className="text-xs font-black text-gold-dark">نظرة مالية</p>
        <h1 className="text-3xl font-black text-brand">الخزنة</h1>
        <p className="text-sm text-stone-500">أرصدة الصناديق والبنوك والشيكات والمبالغ المستحقة، بالعملة الأساسية.</p>
      </div>
      <button type="button" className="btn-outline" onClick={() => void load()} disabled={loading}>تحديث</button>
    </header>

    {error && <div className="rep-error" role="alert">{error} <button type="button" className="underline" onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && <p className="rounded-xl border bg-white p-5 text-stone-500">جارٍ تحميل ملخص الخزنة…</p>}
    {!loading && treasury && <>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="ملخص الأرصدة">
        <SummaryCard title="في الصناديق" value={summary.cashTotal} />
        <SummaryCard title="رصيد البنوك المسجّل" value={summary.bankTotal} hint="يشمل ما تم إيداعه أو تحصيله" />
        <SummaryCard title="شيكات لدى البنوك قيد التحصيل" value={summary.pendingTotal} />
        <SummaryCard title="شيكات بحوزتنا" value={summary.holdingTotal} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="الصناديق النقدية" link="/owner/accounts" linkLabel="إدارة الحسابات" />
          {summary.cashboxes.length ? <div className="divide-y">{summary.cashboxes.map((account) => <AccountRow key={account.account_id} name={account.name} balance={cents(account.balance)} id={account.account_id} />)}</div>
            : <EmptyText text="لا توجد صناديق نقدية." />}
        </div>
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="البنوك" link="/owner/accounts" linkLabel="إدارة الحسابات" />
          {summary.banks.length ? <div className="divide-y">{summary.banks.map((bank) => {
            const posted = cents(bank.balance);
            const pending = summary.pendingByBank.get(bank.account_id) ?? 0;
            return <div key={bank.account_id} className="p-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-black text-brand underline-offset-2 hover:underline" to={accountLink(bank.account_id)}>{bank.name}</Link><b className="text-brand" dir="ltr">{money(posted + pending)}</b></div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600"><span>الرصيد المسجّل: <b className="text-brand" dir="ltr">{money(posted)}</b></span><span>قيد التحصيل: <b className="text-amber-800" dir="ltr">{money(pending)}</b></span></div>
            </div>;
          })}</div> : <EmptyText text="لا توجد حسابات بنكية." />}
          {summary.unlinkedPending !== 0 && <p className="border-t bg-amber-50 px-4 py-2 text-sm text-amber-900">شيكات قيد التحصيل دون بنك مرتبط: <b dir="ltr">{money(summary.unlinkedPending)}</b></p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <SectionHeading title="الشيكات بحوزتنا" link="/owner/checks" linkLabel="عرض الشيكات" />
          {summary.holding.length ? <div className="divide-y">{summary.holding.map((account) => <AccountRow key={account.account_id} name={account.name} balance={cents(account.balance)} id={account.account_id} />)}</div>
            : <EmptyText text="لا يوجد حساب شيكات بحوزتنا." />}
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-brand">أرصدة الحسابات والديون</h2><Link className="text-sm font-bold text-gold-dark underline" to="/owner/accounts">كل الحسابات</Link></div>
          <p className="mt-1 text-xs text-stone-500">من أرصدة الحسابات العامة وحسابات الجهات؛ منفصلة عن النقد والشيكات.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-sm text-emerald-900">مستحق لنا</p><b className="text-xl text-emerald-950" dir="ltr">{money(summary.receivable)}</b></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-sm text-amber-900">مستحق علينا</p><b className="text-xl text-amber-950" dir="ltr">{money(summary.payable)}</b></div>
          </div>
        </div>
      </section>
    </>}
  </div>;
}

function SummaryCard({ title, value, hint }: { title: string; value: number; hint?: string }) {
  return <div className="rounded-xl border bg-white p-3"><p className="text-sm text-stone-600">{title}</p><b className="mt-1 block text-xl text-brand" dir="ltr">{money(value)}</b>{hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}</div>;
}

function SectionHeading({ title, link, linkLabel }: { title: string; link: string; linkLabel: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-stone-50 px-4 py-3"><h2 className="text-lg font-black text-brand">{title}</h2><Link className="text-sm font-bold text-gold-dark underline" to={link}>{linkLabel}</Link></div>;
}

function AccountRow({ name, balance, id }: { name: string; balance: number; id: number }) {
  return <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><Link className="font-bold text-brand underline-offset-2 hover:underline" to={accountLink(id)}>{name}</Link><b className="text-brand" dir="ltr">{money(balance)}</b></div>;
}

function EmptyText({ text }: { text: string }) {
  return <p className="p-4 text-sm text-stone-500">{text}</p>;
}
