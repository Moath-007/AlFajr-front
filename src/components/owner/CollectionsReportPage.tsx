import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { currenciesService, ledgerService, reportsService,
  type CashAccountDto, type CollectionsReportQuery, type CollectionsReportResponseDto,
  type CurrencyDto, type LedgerAccount } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { printA4Element } from '@/utils/printDocument';
import { formatMoney } from '@/utils/money';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month'; account: string;
  method: string; cash: string; currency: string; check: string; actor: string };
const blank: Draft = { from: '', to: '', group: 'day', account: '', method: '', cash: '', currency: '', check: '', actor: '' };
const kindName: Record<string, string> = {
  Receipt: 'سند قبض', ReceiptReversal: 'عكس سند قبض', ReturnedToSource: 'إعادة الشيك إلى مصدره',
  RetrievedFromSource: 'استرجاع الشيك من مصدره', CheckAdjustmentReversal: 'تصحيح تسوية الشيك',
};
const methodName = (method: string) => ({ Cash: 'نقدي', Check: 'شيك' })[method as 'Cash' | 'Check'] ?? method;
const localTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));

export default function CollectionsReportPage() {
  const [draft, setDraft] = useState<Draft>(blank);
  const [query, setQuery] = useState<CollectionsReportQuery>({ page: 1, limit: 20 });
  const [data, setData] = useState<CollectionsReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccountDto[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [actors, setActors] = useState<Array<{ id: number; name: string | null }>>([]);
  const printRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      ledgerService.cashAccounts(controller.signal).then(setCashAccounts),
      ledgerService.accounts(controller.signal).then(setAccounts),
      currenciesService.list(controller.signal).then((result) => setCurrencies(Array.isArray(result)
        ? result : result.items ?? result.currencies ?? [])),
    ]).catch((reason) => { if (!controller.signal.aborted) setLookupError(apiMessages(reason, 'تعذر تحميل خيارات الفلاتر.').join('، ')); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.collections(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); setActors(result.actors); } })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير التحصيلات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    setQuery({ date_from: draft.from || undefined, date_to: draft.to || undefined, group_by: draft.group,
      account_id: draft.account ? Number(draft.account) : undefined,
      payment_method: (draft.method || undefined) as CollectionsReportQuery['payment_method'],
      cash_account_id: draft.cash ? Number(draft.cash) : undefined,
      currency_id: draft.currency ? Number(draft.currency) : undefined,
      check_number: draft.check.trim() || undefined,
      recorded_by: draft.actor ? Number(draft.actor) : undefined, page: 1, limit: 20 });
  };
  const reset = () => { setDraft(blank); setAccountSearch(''); setQuery({ page: 1, limit: 20 }); };
  const page = data?.activity.pagination;
  const selectedAccount = accounts.find((row) => String(row.account_id) === draft.account);
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';

  return <div className="mx-auto max-w-[1450px] space-y-5 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير التحصيلات</h1>
      <p className="mt-2 text-sm text-stone-600">سندات القبض وعكوسها حسب تاريخ القيد المالي. إعادة الشيك إلى مصدره تظهر كتسوية مستقلة في الصافي.</p></header>
    <form onSubmit={apply} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <Select label="التجميع" value={draft.group} onChange={(group) => setDraft({ ...draft, group: group as Draft['group'] })} options={[["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"]]} />
      <Select label="طريقة القبض" value={draft.method} onChange={(method) => setDraft({ ...draft, method })} options={[["", "كل الطرق"], ["Cash", "نقدي"], ["Check", "شيك"]]} />
      <Select label="الصندوق النقدي" value={draft.cash} onChange={(cash) => setDraft({ ...draft, cash })} options={[["", "كل الصناديق"], ...cashAccounts.map((account) => [String(account.account_id), account.name])]} />
      <Select label="العملة" value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency })} options={[["", "كل العملات"], ...currencies.map((currency) => [String(currency.currency_id), currency.code])]} />
      <label className="block"><span className="rep-label">الحساب</span><input className="rep-control mb-1" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="ابحث باسم الحساب" />
        <select className="rep-control" value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value })}><option value="">كل الحسابات</option>{draft.account && !selectedAccount && <option value={draft.account}>حساب #{draft.account}</option>}{accounts.filter((account) => ['General'].includes(account.kind) && account.name.toLocaleLowerCase().includes(accountSearch.trim().toLocaleLowerCase())).map((account) => <option key={account.account_id} value={account.account_id}>{account.name} · #{account.account_id}</option>)}</select></label>
      <Select label="مسجل السند" value={draft.actor} onChange={(actor) => setDraft({ ...draft, actor })} options={[["", "كل المسجلين"], ...actors.map((actor) => [String(actor.id), actor.name ?? `مستخدم #${actor.id}`]), ...(draft.actor && !actors.some((actor) => String(actor.id) === draft.actor) ? [[draft.actor, `مستخدم #${draft.actor}`]] : [])]} />
      <label className="block"><span className="rep-label">رقم الشيك</span><input className="rep-control" value={draft.check} onChange={(event) => setDraft({ ...draft, check: event.target.value })} placeholder="بحث في رقم الشيك" /></label>
      <div className="flex items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button></div>
    </form>
    {lookupError && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{lookupError}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      <div className="flex justify-between gap-2 text-sm text-stone-600"><span>الفترة: {period} · Asia/Hebron · المبالغ المجمعة بالعملة الأساسية</span><button className="btn-outline" onClick={() => printRef.current && void printA4Element({ element: printRef.current, title: 'تقرير التحصيلات', orientation: 'landscape' })}>طباعة / حفظ PDF</button></div>
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير التحصيلات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="إجمالي سندات القبض" value={data.summary.gross_receipts} /><Metric label="عكوس سندات القبض" value={data.summary.receipt_reversals} /><Metric label="تسويات الشيكات المعادة" value={data.summary.check_adjustments} /><Metric label="صافي التحصيلات" value={data.summary.net_collections} /></div>
        <p className="text-xs text-stone-600">صافي التحصيلات = سندات القبض − عكوسها + صافي تسويات إعادة الشيك إلى مصدره. انتقال الشيك إلى البنك لا يضيف تحصيلًا.</p>
        <section className="grid gap-4 lg:grid-cols-3"><Breakdown title="حسب الطريقة" rows={data.by_method.map((row) => ({ label: methodName(row.method), ...row }))} /><Breakdown title="حسب العملة" rows={data.by_currency.map((row) => ({ label: row.currency_code ?? 'عملة غير متاحة', ...row }))} /><Breakdown title="حسب الصندوق النقدي" rows={data.by_cash_account.map((row) => ({ label: row.cash_account_name, ...row }))} /></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">النشاط حسب الفترة</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-stone-100">{['الفترة', 'قبض', 'عكوس', 'تسويات شيكات', 'صافي'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.time_series.map((row) => <tr key={row.period}><td className="border p-2">{row.period}</td><td className="border p-2">{formatMoney(row.gross_receipts)}</td><td className="border p-2">{formatMoney(row.receipt_reversals)}</td><td className="border p-2">{formatMoney(row.check_adjustments)}</td><td className="border p-2 font-bold">{formatMoney(row.net_collections)}</td></tr>)}</tbody></table>{!data.time_series.length && <p className="p-4 text-stone-500">لا يوجد نشاط في الفترة.</p>}</div></section>
        <section><h2 className="mb-3 text-lg font-black text-brand">حركات التحصيل</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / المرجع', 'الحساب', 'الطريقة / الحساب', 'العملة / المبلغ الأصلي', 'مسجل السند / الحالة الحالية', 'الأثر بالعملة الأساسية'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <tr key={row.journal_entry_id}><td className="border p-2">{localTime(row.occurred_at)}</td><td className="border p-2"><b>{kindName[row.kind]}</b><small className="block text-stone-500">{row.voucher_number} · قيد #{row.journal_entry_id}</small>{row.check_number && <small className="block">شيك {row.check_number} · {row.check_bank_name ?? 'بنك غير محدد'} · استحقاق {row.check_due_date?.slice(0, 10) ?? '—'}</small>}</td><td className="border p-2">{row.account.name}</td><td className="border p-2">{methodName(row.payment_method)}<small className="block">{row.cash_account?.name ?? row.bank_account_name ?? '—'}</small></td><td className="border p-2">{row.currency?.code ?? '—'} · {formatMoney(row.original_amount)}<small className="block">سعر الصرف {row.exchange_rate ?? '—'}</small></td><td className="border p-2">{row.recorded_by?.name ?? '—'}<small className="block">السند حاليًا: {row.current_payment_status === 'Cancelled' ? 'ملغى' : 'فعال'}{row.check_current_location ? ` · الشيك حاليًا: ${row.check_current_location}` : ''}</small></td><td className="border p-2 font-bold">{formatMoney(row.base_effect)}</td></tr>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{kindName[row.kind]}</b><b>{formatMoney(row.base_effect)}</b></div><p>{localTime(row.occurred_at)} · {row.voucher_number} · {row.account.name}</p><p>{methodName(row.payment_method)} · {row.currency?.code ?? '—'} {formatMoney(row.original_amount)} · {row.cash_account?.name ?? row.bank_account_name ?? '—'}</p>{row.check_number && <p>شيك {row.check_number} · {row.check_bank_name ?? '—'}</p>}</div>)}</div>
          {!data.activity.items.length && <p className="p-4 text-stone-500">لا توجد حركات.</p>}
        </section>
      </article>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حركة</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="rep-label">{label}</span><select className="rep-control" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand">{formatMoney(value)}</b></div>;
}
function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; gross_receipts: string; receipt_reversals: string; check_adjustments: string; net_collections: string }> }) {
  return <div className="rounded-xl border p-4"><h2 className="mb-3 font-black text-brand">{title}</h2><div className="space-y-2">{rows.map((row) => <div key={row.label} className="border-b pb-2 text-sm"><span>{row.label}</span><span className="block text-stone-600">قبض {formatMoney(row.gross_receipts)} · عكس {formatMoney(row.receipt_reversals)} · تسوية {formatMoney(row.check_adjustments)} · صافي <b>{formatMoney(row.net_collections)}</b></span></div>)}{!rows.length && <p className="text-stone-500">لا توجد بيانات.</p>}</div></div>;
}

