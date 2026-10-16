import { Fragment } from 'react';
import StatementSourceDetailsView from '@/components/finance/StatementSourceDetails';
import type { StatementSourceDetails } from '@/api/types/ledger';
import { reportDocumentProducts } from '@/components/reports/reportDocumentProducts';
import Modal from '@/components/ui/Modal';
import { SlidersHorizontal } from 'lucide-react';
import { currentMonth } from '@/components/finance/accountUiUtils';
import '@/components/reports/ReportsLayout.css';
import CommercialClassificationFilter from '@/components/finance/CommercialClassificationFilter';
import FinancialAccountFilter from '@/components/finance/FinancialAccountFilter';
import { ReportOptions, ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { representativesService, reportsService,
  type RepresentativeResponseDto, type SalesReportQuery,
  type SalesReportResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month';
  account: string; representative: string; classification?:'Customer'|'Supplier' };
const blank: Draft = { from: '', to: '', group: 'day', account: '', representative: '' };
const kindName: Record<string, string> = { Sale: 'بيع', SaleReversal: 'إلغاء بيع', SalesReturn: 'مردود بيع', ReturnReversal: 'إلغاء مردود' };
const referenceText = (row: SalesReportResponseDto['activity']['items'][number]) => [
  row.order_id ? `فاتورة #${row.order_id}` : null,
  row.return_id ? `مردود #${row.return_id}` : null,
  `حركة #${row.journal_entry_id}`,
].filter(Boolean).join(' · ');
const localTime = (value: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));

export default function SalesReportPage() {
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [extra,setExtra]=useState<Pick<Draft,'classification'|'account'|'representative'>>({account:'',representative:''});
  const [draft, setDraft] = useState<Draft>(()=>({...blank,...currentMonth()}));
  const [query, setQuery] = useState<SalesReportQuery>(()=>({ page:1,limit:20,date_from:currentMonth().from,date_to:currentMonth().to }));
  const [loadedData, setData] = useState<SalesReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [representatives, setRepresentatives] = useState<RepresentativeResponseDto[]>([]);
  const [lookupError, setLookupError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<SalesReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;
  const printDocuments=useRef(new Map<string,StatementSourceDetails|null>());
  async function printReport(){
    printDocuments.current=new Map();
    await fullPrint.print(async(page,signal)=>{
      const result=await reportsService.sales({...query,page,limit:100},signal);
      const keys=[...new Set(result.activity.items.map(row=>row.return_id?'SalesReturn:'+row.return_id:row.order_id?'Order:'+row.order_id:'').filter(Boolean))].filter(key=>!printDocuments.current.has(key));
      for(let i=0;i<keys.length;i+=4)await Promise.all(keys.slice(i,i+4).map(async key=>{const [kind,id]=key.split(':');printDocuments.current.set(key,await reportDocumentProducts(kind as 'Order'|'SalesReturn'|'PurchaseReturn',Number(id),signal));}));
      return result;
    },'تقرير المبيعات');
  }


  useEffect(() => {
    const controller = new AbortController();
    representativesService.list(undefined, controller.signal)
      .then((result) => setRepresentatives(result.representatives))
      .catch((reason) => { if (!controller.signal.aborted) setLookupError(apiMessages(reason, 'تعذر تحميل المناديب.').join('، ')); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.sales(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) { setData(null); setError(apiMessages(reason, 'تعذر تحميل تقرير المبيعات.').join('، ')); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) { setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.'); return; }
    setQuery({ commercial_classification:draft.classification, date_from: draft.from || undefined, date_to: draft.to || undefined,
      group_by: draft.group,
      sale_account_id: draft.account ? Number(draft.account) : undefined,
      created_by: draft.representative ? Number(draft.representative) : undefined,
      page: 1, limit: 20 });
  };
  const reset = () => { setDraft({...blank,...currentMonth()}); setQuery({ page:1,limit:20,date_from:currentMonth().from,date_to:currentMonth().to }); };
  const page = data?.activity.pagination;
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';

  return <div className="report-page mx-auto max-w-[1450px] space-y-4 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المبيعات</h1>
      <details className="report-note mt-2"><summary>كيف تقرأ التقرير؟</summary><p className="mt-2 text-sm text-stone-600">المبيعات والمردودات والإلغاءات خلال الفترة، حسب تاريخ تسجيل كل حركة مالية. الصافي هو المبيعات بعد خصم مردوداتها، وليس الربح أو المقبوضات.</p></details></header>
    <form onSubmit={apply} className="space-y-3 rounded-xl border bg-white p-4"><div className="grid items-end gap-3 sm:grid-cols-[200px_200px_auto] sm:justify-start">
      <RepDateInput label="من تاريخ" value={draft.from} onChange={(from) => setDraft({ ...draft, from })} max={draft.to || undefined} />
      <RepDateInput label="إلى تاريخ" value={draft.to} onChange={(to) => setDraft({ ...draft, to })} min={draft.from || undefined} />
      <div className="flex flex-wrap items-end gap-2"><button className="btn-primary min-h-11">تطبيق</button><button type="button" className="btn-outline min-h-11" onClick={reset}>إعادة ضبط</button><button type="button" className="btn-outline min-h-11 inline-flex items-center gap-2" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={()=>{setExtra({classification:query.commercial_classification,account:query.sale_account_id?String(query.sale_account_id):'',representative:query.created_by?String(query.created_by):''});setFiltersOpen(true);}}><SlidersHorizontal size={16} aria-hidden/>الفلاتر{[query.commercial_classification,query.sale_account_id,query.created_by].filter(Boolean).length?` (${[query.commercial_classification,query.sale_account_id,query.created_by].filter(Boolean).length})`:''}</button>{data&&<button type="button" className="btn-outline" disabled={loading || fullPrint.printing} onClick={()=>void printReport()}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>}</div></div>

    </form>
    <Modal open={filtersOpen} onClose={()=>setFiltersOpen(false)} title="فلاتر تقرير المبيعات" className="filters-drawer" footer={<div dir="rtl" className="grid grid-cols-2 gap-3"><button type="button" className="btn-primary" onClick={()=>{setDraft(current=>({...current,...extra}));setQuery(current=>({...current,commercial_classification:extra.classification,sale_account_id:extra.account?Number(extra.account):undefined,created_by:extra.representative?Number(extra.representative):undefined,page:1}));setFiltersOpen(false);}}>تطبيق الفلاتر</button><button type="button" className="btn-outline" onClick={()=>setExtra({account:'',representative:''})}>مسح الكل</button></div>}><div dir="rtl" className="space-y-5"><p className="text-sm text-stone-500">حدّد خياراتك، ثم اضغط تطبيق لتحديث النتائج.</p><CommercialClassificationFilter value={extra.classification} onChange={classification=>setExtra(current=>({...current,classification,account:''}))}/><FinancialAccountFilter key={extra.classification??'all'} classification={extra.classification} label="حساب البيع" value={extra.account} onChange={account=>setExtra(current=>({...current,account}))}/><Select label="المندوب المنشئ" value={extra.representative} onChange={representative=>setExtra(current=>({...current,representative}))} options={[["", "كل المناديب"],...representatives.map(rep=>[String(rep.user_id),rep.name])]}/></div></Modal>
    {(lookupError) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{lookupError}</p>}
    {data?.filter_scope === 'known_metadata_only' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">عند اختيار منشئ محدد، تظهر الحركات التي تتوفر بيانات منشئها. حركات الفواتير المحذوفة تبقى في الإجمالي العام.</p>}
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>
      
      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المبيعات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-3"><Metric label="المبيعات المسجّلة بالفترة" value={data.summary.gross_sales} /><Metric label="مردود المبيعات" value={data.summary.returns} /><Metric label="صافي المبيعات" value={data.summary.net_sales} /></div>
        <section className="border-t pt-4"><h2 className="font-bold text-brand">تفاصيل العمليات</h2><div className="mt-4 space-y-5"><section aria-label="تفاصيل العمليات">
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', 'الحركة / رقم المستند', 'حساب البيع', 'أنشأها', 'مبلغ الحركة'].map((x) => <th key={x} className="border p-2 text-right">{x}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <Fragment key={row.journal_entry_id}><tr><td className="border p-2">{localTime(row.occurred_at)}</td><td className="border p-2"><b>{kindName[row.kind]}</b><small className="block text-stone-500">{fullPrint.printData?(row.return_id?'مردود #'+row.return_id:row.order_id?'فاتورة #'+row.order_id:'—'):referenceText(row)}</small>{(row.order_id || row.return_id) && <Link data-print-ignore className="block text-brand underline" to={row.order_id ? `/owner/orders/${row.order_id}` : `/owner/returns?return=${row.return_id}`}>عرض التفاصيل ↗</Link>}</td><td className="border p-2">{row.sale_account_name ?? '—'}</td><td className="border p-2">{row.creator?.name ?? '—'}</td><td className="border p-2 font-bold"><ReportAmount value={row.net_effect} /></td></tr>{fullPrint.printData&&<tr data-report-detail-row><td colSpan={5}><div className="p-2">{printDocuments.current.get(row.return_id?'SalesReturn:'+row.return_id:row.order_id?'Order:'+row.order_id:'')?<StatementSourceDetailsView details={printDocuments.current.get(row.return_id?'SalesReturn:'+row.return_id:row.order_id?'Order:'+row.order_id:'')!} showHeading={false} customerPrint reportPrint/>:<p className="text-xs text-stone-500">تفاصيل منتجات المستند غير متاحة؛ الحركة المالية محفوظة.</p>}</div></td></tr>}</Fragment>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{kindName[row.kind]}</b><b><ReportAmount value={row.net_effect} /></b></div><p>{localTime(row.occurred_at)} · {referenceText(row)}</p><p>{row.sale_account_name ?? 'بدون حساب بيع'}</p>{(row.order_id || row.return_id) && <Link className="text-brand underline" to={row.order_id ? `/owner/orders/${row.order_id}` : `/owner/returns?return=${row.return_id}`}>عرض التفاصيل ↗</Link>}</div>)}</div>
          {!data.activity.items.length && <p className="p-4 text-stone-500">لا توجد حركات.</p>}
        </section>
      {page && page.total_pages > 1 && <div data-print-ignore className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page.page <= 1} onClick={() => setQuery({ ...query, page: page.page - 1 })}>السابق</button><span>صفحة {page.page} من {page.total_pages} · {page.total} حركة</span><button className="btn-outline" disabled={page.page >= page.total_pages} onClick={() => setQuery({ ...query, page: page.page + 1 })}>التالي</button></div>}
        </div></section>
      </article>

    </>}
  </div>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block"><span className="rep-label">{label}</span><ReportOptions value={value} onChange={(value) => onChange(value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</ReportOptions></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-stone-50 p-4"><span className="text-xs text-stone-600">{label}</span><b className="mt-2 block text-xl text-brand"><ReportAmount value={value} /></b></div>;
}
