import { currentMonth } from '@/components/finance/accountUiUtils';
import Modal from '@/components/ui/Modal';
import { SlidersHorizontal } from 'lucide-react';
import '@/components/reports/ReportsLayout.css';
import CommercialClassificationFilter from '@/components/finance/CommercialClassificationFilter';
import { locationLabels } from '@/components/finance/checkPresentation';
import type { ManagedCheckLocation } from '@/api';
import FinancialAccountFilter from '@/components/finance/FinancialAccountFilter';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { currenciesService, reportsService,
  type CollectionsReportQuery, type CollectionsReportResponseDto,
  type CurrencyDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month'; account: string;
  method: string; cash: string; currency: string; check: string; actor: string; classification?:'Customer'|'Supplier' };
const blank: Draft = { from: '', to: '', group: 'day', account: '', method: '', cash: '', currency: '', check: '', actor: '' };
const kindName: Record<string, string> = {
  Receipt: 'سند قبض', ReceiptReversal: 'إلغاء أثر سند قبض', ReturnedToSource: 'إعادة الشيك إلى مصدره',
  RetrievedFromSource: 'استرجاع الشيك من مصدره', CheckAdjustmentReversal: 'تصحيح تسوية الشيك',
};
const methodName = (method: string) => ({ Cash: 'نقدي', Check: 'شيك', BankTransfer: 'حوالة بنكية' })[method as 'Cash' | 'Check' | 'BankTransfer'] ?? method;
const localTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));

export default function CollectionsReportPage() {
  const [draft, setDraft] = useState<Draft>(()=>({...blank,...currentMonth()}));
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [extra,setExtra]=useState<Draft>(blank);
  const [query, setQuery] = useState<CollectionsReportQuery>(()=>({page:1,limit:20,group_by:'day',date_from:currentMonth().from,date_to:currentMonth().to}));
  const [loadedData, setData] = useState<CollectionsReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dateError = draft.from && draft.to && draft.from > draft.to ? 'تاريخ البداية يجب أن يسبق تاريخ النهاية.' : '';
  const [lookupError, setLookupError] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [actors, setActors] = useState<Array<{ id: number; name: string | null }>>([]);
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<CollectionsReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
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
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المقبوضات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const reset=()=>{const initial={...blank,...currentMonth()};setDraft(initial);setQuery({page:1,limit:20,group_by:'day',date_from:initial.from,date_to:initial.to});};
  const page = data?.activity.pagination;
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';

  return <div className="report-page mx-auto max-w-[1450px] space-y-4 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المقبوضات</h1>
      <details className="report-note mt-2"><summary>كيف تقرأ التقرير؟</summary><p className="mt-2 text-sm text-stone-600">ما تم قبضه نقدًا أو بشيك أو حوالة خلال الفترة، مع الإلغاءات وإرجاع الشيكات للحساب. نقل الشيك إلى البنك لا يُحسب قبضًا جديدًا.</p></details></header>
    <form className="rounded-xl border bg-white p-4" onSubmit={event=>{event.preventDefault();if(dateError)return;setQuery(v=>({...v,date_from:draft.from||undefined,date_to:draft.to||undefined,page:1}));}}><div className="grid items-end gap-3 sm:grid-cols-[200px_200px_auto] sm:justify-start"><RepDateInput label="من تاريخ" value={draft.from} max={draft.to||undefined} onChange={from=>setDraft(v=>({...v,from}))}/><RepDateInput label="إلى تاريخ" value={draft.to} min={draft.from||undefined} onChange={to=>setDraft(v=>({...v,to}))}/><div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={!!dateError}>تطبيق</button><button type="button" className="btn-outline" onClick={reset}>إعادة ضبط</button><button type="button" className="btn-outline inline-flex items-center gap-2" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={()=>{setExtra({...blank,method:query.payment_method??'',currency:query.currency_id?String(query.currency_id):'',account:query.account_id?String(query.account_id):'',actor:query.recorded_by?String(query.recorded_by):'',check:query.check_number??'',classification:query.commercial_classification});setFiltersOpen(true);}}><SlidersHorizontal size={16} aria-hidden/>الفلاتر{[query.payment_method,query.currency_id,query.account_id,query.recorded_by,query.check_number,query.commercial_classification].filter(Boolean).length?` (${[query.payment_method,query.currency_id,query.account_id,query.recorded_by,query.check_number,query.commercial_classification].filter(Boolean).length})`:''}</button>{data&&<button type="button" className="btn-outline" disabled={loading || fullPrint.printing || Boolean(dateError)} onClick={() => void fullPrint.print((page, signal) => reportsService.collections({ ...query, page, limit: 100 }, signal), 'تقرير المقبوضات')}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>}</div></div></form>
    <Modal open={filtersOpen} onClose={()=>setFiltersOpen(false)} title="فلاتر تقرير المقبوضات" className="filters-drawer" footer={<div dir="rtl" className="grid grid-cols-2 gap-3"><button type="button" className="btn-primary" onClick={()=>{setQuery(v=>({...v,commercial_classification:extra.classification,payment_method:(extra.method||undefined) as CollectionsReportQuery['payment_method'],currency_id:extra.currency?Number(extra.currency):undefined,account_id:extra.account?Number(extra.account):undefined,recorded_by:extra.actor?Number(extra.actor):undefined,check_number:extra.check.trim()||undefined,page:1}));setFiltersOpen(false);}}>تطبيق الفلاتر</button><button type="button" className="btn-outline" onClick={()=>setExtra(blank)}>مسح الكل</button></div>}><div dir="rtl" className="space-y-5"><p className="text-sm text-stone-500">حدّد خياراتك، ثم اضغط تطبيق لتحديث النتائج.</p>      <Select label="طريقة القبض" value={extra.method} onChange={(method) => setExtra({ ...extra, method })} options={[["", "كل الطرق"], ["Cash", "نقدي"], ["Check", "شيك"], ["BankTransfer", "حوالة بنكية"]]} />
      <Select label="العملة" value={extra.currency} onChange={(currency) => setExtra({ ...extra, currency })} options={[["", "كل العملات"], ...currencies.map((currency) => [String(currency.currency_id), currency.code])]} />
      <CommercialClassificationFilter value={extra.classification} onChange={classification=>setExtra(v=>({...v,classification,account:''}))}/>
      <FinancialAccountFilter key={extra.classification??'all'} classification={extra.classification} value={extra.account} onChange={account=>setExtra({...extra,account})}/>
      <Select label="مسجل السند" value={extra.actor} onChange={(actor) => setExtra({ ...extra, actor })} options={[["", "كل المسجلين"], ...actors.map((actor) => [String(actor.id), actor.name ?? `مستخدم #${actor.id}`]), ...(extra.actor && !actors.some((actor) => String(actor.id) === extra.actor) ? [[extra.actor, `مستخدم #${extra.actor}`]] : [])]} />
      <label className="block"><span className="rep-label">رقم الشيك</span><input className="rep-control" value={extra.check} onChange={(event) => setExtra({ ...extra, check: event.target.value })} placeholder="بحث في رقم الشيك" /></label>
</div></Modal>
    {lookupError && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{lookupError}</p>}
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {dateError && <p className="rep-error" role="alert">{dateError}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>

      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المقبوضات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="إجمالي سندات القبض" value={data.summary.gross_receipts} /><Metric label="إلغاءات وتصحيحات القبض" value={data.summary.receipt_reversals} /><Metric label="تغييرات الشيكات المرجعة" value={data.summary.check_adjustments} /><Metric label="صافي المقبوضات" value={data.summary.net_collections} /></div>
        <section><h2 className="mb-3 text-lg font-black text-brand">تفاصيل العمليات</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / رقم المستند', 'الحساب', 'الطريقة / الحساب', 'العملة / مبلغ السند الحالي', 'مسجل السند الحالي / الحالة', 'أثر الحركة بالعملة الأساسية'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <tr key={row.journal_entry_id}><td className="border p-2">{localTime(row.occurred_at)}</td><td className="border p-2"><b>{kindName[row.kind]}</b><small className="block text-stone-500">{row.voucher_number} · حركة #{row.journal_entry_id}</small><Link data-print-ignore className="block text-brand underline" to={`/owner/account-sources/Payment/${row.payment_id}`}>عرض التفاصيل ↗</Link>{row.check_number && <small className="block">شيك {row.check_number} · {row.check_bank_name ?? 'بنك غير محدد'} · استحقاق {row.check_due_date?.slice(0, 10) ?? '—'}</small>}</td><td className="border p-2">{row.account.name}</td><td className="border p-2">{methodName(row.payment_method)}<small className="block">{row.cash_account?.name ?? row.bank_account_name ?? '—'}</small></td><td className="border p-2">{row.currency?.code ?? '—'} · <ReportAmount value={row.original_amount} currency={row.currency?.code ?? undefined} /><small className="block">سعر الصرف {row.exchange_rate ?? '—'}</small></td><td className="border p-2">{row.recorded_by?.name ?? '—'}<small className="block">السند حاليًا: {row.current_payment_status === 'Cancelled' ? 'ملغى' : 'فعال'}{row.check_current_location ? ` · الشيك حاليًا: ${locationLabels[row.check_current_location as ManagedCheckLocation] ?? row.check_current_location}` : ''}</small></td><td className="border p-2 font-bold"><ReportAmount value={row.base_effect} /></td></tr>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{kindName[row.kind]}</b><b><ReportAmount value={row.base_effect} /></b></div><p>{localTime(row.occurred_at)} · {row.voucher_number} · {row.account.name}</p><p>{methodName(row.payment_method)} · {row.currency?.code ?? '—'} <ReportAmount value={row.original_amount} currency={row.currency?.code ?? undefined} /> · {row.cash_account?.name ?? row.bank_account_name ?? '—'}</p>{row.check_number && <p>شيك {row.check_number} · {row.check_bank_name ?? '—'}</p>}<Link className="text-brand underline" to={`/owner/account-sources/Payment/${row.payment_id}`}>عرض التفاصيل ↗</Link></div>)}</div>
          {!data.activity.items.length && <p className="p-4 text-stone-500">لا توجد حركات.</p>}
        </section>
      </article>
      {page && page.total_pages > 1 && <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حركة</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
    </>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="rep-label">{label}</span><ReportOptions value={value} onChange={(value) => onChange(value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</ReportOptions></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand"><ReportAmount value={value} /></b></div>;
}
