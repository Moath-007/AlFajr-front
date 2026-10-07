import SearchableSelect from '@/components/ui/Select';
import { useGeneralSaleAccounts } from '@/components/orders/useGeneralSaleAccounts';
import { useReportPrint } from '@/components/reports/useReportPrint';
import PrintHeader from '@/components/printing/PrintHeader';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, type AccountBalancesReportQuery, type AccountBalancesReportResponseDto } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';

type Side = NonNullable<AccountBalancesReportQuery['balance_side']>;
const sideLabel: Record<Side, string> = { All: 'كل الأرصدة', Debit: 'مستحق لنا (سالب)', Credit: 'مستحق علينا (موجب)', Zero: 'بدون رصيد' };

export default function AccountBalancesReportPage() {

  const accounts = useGeneralSaleAccounts();

  const [query, setQuery] = useState<AccountBalancesReportQuery>({ page: 1, limit: 20, balance_side: 'All' });
  const [loadedData, setData] = useState<AccountBalancesReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.accountBalances(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل أرصدة الحسابات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const reset = () => setQuery({ balance_side: 'All', page: 1, limit: 20 });
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<AccountBalancesReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;
  const page = data?.pagination;
  return <div className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير أرصدة الحسابات</h1>
      <p className="mt-2 text-sm text-stone-600">أرصدة الحسابات العامة الآن: الرصيد السالب مستحق لنا، والموجب مستحق للحساب علينا. الشيكات الواردة بالخزنة والبنك تظهر بشكل منفصل ولا تُضاف مرة ثانية إلى الرصيد.</p></header>
    <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-end">
      <SearchableSelect className="min-w-0 flex-1" label="الحساب" searchable searchPlaceholder="ابحث باسم الحساب أو رقمه أو الهاتف" loading={accounts.loading} value={query.account_id ? String(query.account_id) : ''} onChange={(value) => setQuery((current) => ({ ...current, account_id: value ? Number(value) : undefined, page: 1 }))} options={[
        { value: '', label: 'كل الحسابات' },
        ...accounts.accounts.map((account) => ({ value: String(account.id), label: [account.name, account.account_number, account.phone].filter(Boolean).join(' · ') })),
      ]} />
      <label className="min-w-[170px]"><span className="rep-label">عرض الأرصدة</span><ReportOptions value={query.balance_side ?? 'All'} onChange={(value) => setQuery((current) => ({ ...current, balance_side: value as Side, page: 1 }))}>{(Object.keys(sideLabel) as Side[]).map((side) => <option key={side} value={side}>{sideLabel[side]}</option>)}</ReportOptions></label>
      <div className="flex gap-2"><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </div>
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {accounts.error && <p role="alert" className="rep-error">{accounts.error}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <div className="flex justify-end"><button className="btn-outline" disabled={fullPrint.printing} onClick={() => void fullPrint.print((page, signal) => reportsService.accountBalances({ ...query, page, limit: 100 }, signal), 'تقرير أرصدة الحسابات')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button></div>
      <article ref={printRef} className="print-document space-y-4">
      <PrintHeader company={null} title="تقرير أرصدة الحسابات" />
      <p className="text-sm text-stone-600">آخر تحديث: {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.snapshot_at))} · الأرقام بالعملة الأساسية</p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="ملخص أرصدة الحسابات">
        <Metric label="حسابات ذوو رصيد" value={data.summary.accounts_with_balance} />
        <Metric label="إجمالي الأرصدة المدينة" value={data.summary.debit_balances} money />
        <Metric label="إجمالي الأرصدة الدائنة" value={data.summary.credit_balances} money />
        <Metric label="الرصيد الإجمالي" value={data.summary.net_balance} money />
      </section>
      <p className="text-xs text-stone-600">الرصيد السالب مستحق لنا، والموجب مستحق للحساب علينا. الملخص يشمل جميع الحسابات المطابقة للبحث والفلاتر.</p>
      <section className="rounded-2xl border bg-white p-4 sm:p-6"><div className="mb-3 flex justify-between gap-2"><h2 className="text-lg font-black text-brand">الحسابات</h2><span className="text-sm text-stone-500">{data.summary.accounts_count} حساب</span></div>
        <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-stone-100">{['الحساب', 'الهاتف', 'رقم الحساب', 'الرصيد بعد الحركات', 'شيكات واردة بالخزنة', 'شيكات بالبنك / قيد التحصيل', 'الإجراءات'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.items.map((row) => <tr key={row.account.id}><td className="border p-2 font-bold">{row.account.name}</td><td className="border p-2">{row.account.phone}</td><td className="border p-2">{row.account.number}</td><td className="border p-2 font-bold"><ReportAmount value={row.balance_base} balance /></td><td className="border p-2"><ReportAmount value={row.pending_checks_base} /><small className="block text-stone-500">لا تُضاف مرة ثانية إلى الرصيد</small></td><td className="border p-2">{row.bank_checks_base != null ? <ReportAmount value={row.bank_checks_base} /> : '—'}<small className="block text-stone-500">لا تُضاف مرة ثانية إلى الرصيد</small></td><td className="border p-2"><div className="flex flex-wrap gap-2"><Link className="text-gold-dark underline" to={`/owner/accounts/${row.account.id}/statement`}>كشف الحساب</Link><Link className="text-brand underline" to={`/owner/accounts/${row.account.id}`}>عرض الحساب</Link></div></td></tr>)}</tbody></table></div>
        <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.items.map((row) => <div key={row.account.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.account.name}</b><b><ReportAmount value={row.balance_base} balance /></b></div><p>{row.account.phone} · {sideLabel[row.balance_side]} · {row.account.name ?? 'بدون حساب بعد'}</p><p className="text-stone-500">شيكات واردة بالخزنة: <ReportAmount value={row.pending_checks_base} /> (منفصلة عن الرصيد)</p><p className="text-stone-500">شيكات بالبنك / قيد التحصيل: {row.bank_checks_base != null ? <ReportAmount value={row.bank_checks_base} /> : '—'}</p><div className="mt-2 flex gap-3"><Link className="text-gold-dark underline" to={`/owner/accounts/${row.account.id}/statement`}>كشف الحساب</Link><Link className="text-brand underline" to={`/owner/accounts/${row.account.id}`}>عرض الحساب</Link></div></div>)}</div>
        {!data.items.length && <p className="p-4 text-stone-500">لا يوجد حسابات يطابقون البحث والفلتر.</p>}
      </section>
      </article>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حساب</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Metric({ label, value, money }: { label: string; value: string | number; money?: boolean }) {
  return <div className="rounded-xl border bg-white p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{money ? <ReportAmount value={value} balance={label === 'الرصيد الإجمالي'} credit={label === 'إجمالي الأرصدة الدائنة'} /> : value}</b></div>;
}
