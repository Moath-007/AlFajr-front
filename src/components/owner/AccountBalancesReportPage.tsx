import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, type AccountBalancesReportQuery, type AccountBalancesReportResponseDto } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { formatMoney } from '@/utils/money';

type Side = NonNullable<AccountBalancesReportQuery['balance_side']>;
const sideLabel: Record<Side, string> = { All: 'كل الأرصدة', Debit: 'رصيد مدين', Credit: 'رصيد دائن', Zero: 'بدون رصيد' };

export default function AccountBalancesReportPage() {
  const [draftSearch, setDraftSearch] = useState('');
  const [draftSide, setDraftSide] = useState<Side>('All');
  const [query, setQuery] = useState<AccountBalancesReportQuery>({ page: 1, limit: 20, balance_side: 'All' });
  const [data, setData] = useState<AccountBalancesReportResponseDto | null>(null);
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

  const apply = (event: FormEvent) => {
    event.preventDefault();
    setQuery({ search: draftSearch.trim() || undefined, balance_side: draftSide, page: 1, limit: 20 });
  };
  const reset = () => {
    setDraftSearch(''); setDraftSide('All');
    setQuery({ balance_side: 'All', page: 1, limit: 20 });
  };
  const page = data?.pagination;
  return <div className="mx-auto max-w-[1350px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير أرصدة الحسابات</h1>
      <p className="mt-2 text-sm text-stone-600">لقطة للأرصدة الحالية في الحسابات العامة من دفتر اليومية. الرصيد ليس متبقي الفواتير، والشيكات المعلقة معلومة منفصلة.</p></header>
    <form onSubmit={apply} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1"><span className="rep-label">بحث باسم الحساب أو الهاتف</span><input className="rep-control" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="الاسم أو رقم الهاتف" /></label>
      <label className="min-w-[170px]"><span className="rep-label">طبيعة الرصيد</span><select className="rep-control" value={draftSide} onChange={(event) => setDraftSide(event.target.value as Side)}>{(Object.keys(sideLabel) as Side[]).map((side) => <option key={side} value={side}>{sideLabel[side]}</option>)}</select></label>
      <div className="flex gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </form>
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <p className="text-sm text-stone-600">لقطة حالية: {new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.snapshot_at))} · الأرقام بالعملة الأساسية</p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="ملخص أرصدة الحسابات">
        <Metric label="عملاء ذوو رصيد" value={data.summary.accounts_with_balance} />
        <Metric label="إجمالي الأرصدة المدينة" value={data.summary.debit_balances} money />
        <Metric label="إجمالي الأرصدة الدائنة" value={data.summary.credit_balances} money />
        <Metric label="صافي الأرصدة بإشاراتها" value={data.summary.net_balance} money />
      </section>
      <p className="text-xs text-stone-600">المدين = مجموع الأرصدة الموجبة، والدائن = القيمة المطلقة للأرصدة السالبة. الصافي يجمع الأرصدة بإشاراتها. الملخص يشمل كل الحسابات المطابقين للبحث والفلتر مهما كانت صفحة الجدول.</p>
      <section className="rounded-2xl border bg-white p-4 sm:p-6"><div className="mb-3 flex justify-between gap-2"><h2 className="text-lg font-black text-brand">حسابات الحسابات</h2><span className="text-sm text-stone-500">{data.summary.accounts_count} عميل</span></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['الحساب', 'الهاتف', 'رقم الحساب', 'الرصيد', 'الطبيعة', 'شيكات معلقة', 'الإجراءات'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.items.map((row) => <tr key={row.account.id}><td className="border p-2 font-bold">{row.account.name}</td><td className="border p-2">{row.account.phone}</td><td className="border p-2">{row.account.number}</td><td className="border p-2 font-bold">{formatMoney(row.balance_base)}</td><td className="border p-2">{sideLabel[row.balance_side]}</td><td className="border p-2">{formatMoney(row.pending_checks_base)}<small className="block text-stone-500">معلومة تشغيلية منفصلة</small></td><td className="border p-2"><div className="flex flex-wrap gap-2"><Link className="text-gold-dark underline" to={`/owner/accounts/${row.account.id}`}>كشف الحساب</Link><Link className="text-brand underline" to={`/owner/accounts/${row.account.id}`}>عرض الحساب</Link></div></td></tr>)}</tbody></table></div>
        <div className="space-y-2 md:hidden">{data.items.map((row) => <div key={row.account.id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.account.name}</b><b>{formatMoney(row.balance_base)}</b></div><p>{row.account.phone} · {sideLabel[row.balance_side]} · {row.account.name ?? 'بدون حساب بعد'}</p><p className="text-stone-500">شيكات معلقة: {formatMoney(row.pending_checks_base)} (منفصلة عن الرصيد)</p><div className="mt-2 flex gap-3"><Link className="text-gold-dark underline" to={`/owner/accounts/${row.account.id}`}>كشف الحساب</Link><Link className="text-brand underline" to={`/owner/accounts/${row.account.id}`}>عرض الحساب</Link></div></div>)}</div>
        {!data.items.length && <p className="p-4 text-stone-500">لا يوجد عملاء يطابقون البحث والفلتر.</p>}
      </section>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} عميل</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Metric({ label, value, money }: { label: string; value: string | number; money?: boolean }) {
  return <div className="rounded-xl border bg-white p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{money ? formatMoney(String(value)) : value}</b></div>;
}
