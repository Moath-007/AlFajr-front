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
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsService, type ReturnsReportQuery,
  type ReturnsReportResponseDto } from '@/api';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { apiMessages } from '@/components/rep/repOrderUtils';
import PrintHeader from '@/components/printing/PrintHeader';
import { useReportPrint } from '@/components/reports/useReportPrint';

type Draft = { from: string; to: string; group: 'day' | 'week' | 'month'; type: string; account: string; search: string };
const blank: Draft = { from: '', to: '', group: 'day', type: '', account: '', search: '' };
const typeName: Record<string, string> = { SalesReturn: 'مردود مبيعات', PurchaseReturn: 'مردود مشتريات' };
const localDate = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Hebron',
  year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const reference = (row: ReturnsReportResponseDto['activity']['items'][number]) => [
  row.return_id ? `مردود #${row.return_id}` : null,
  row.order_id ? `فاتورة #${row.order_id}` : null,
  row.customer_purchase_id ? `شراء #${row.customer_purchase_id}` : null,
  `حركة #${row.journal_entry_id}`,
].filter(Boolean).join(' · ');

export default function ReturnsReportPage() {
  const [draft, setDraft] = useState<Draft>(()=>({...blank,...currentMonth()}));
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [extra,setExtra]=useState<{type:string;account:string;search:string;classification?:'Customer'|'Supplier'}>({type:'',account:'',search:''});
  const [query, setQuery] = useState<ReturnsReportQuery>(()=>({ page:1,limit:20,group_by:'day',date_from:currentMonth().from,date_to:currentMonth().to }));
  const [loadedData, setData] = useState<ReturnsReportResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLElement>(null);
  const fullPrint = useReportPrint<ReturnsReportResponseDto>(printRef, query);
  const data = fullPrint.printData ?? loadedData;
  const printDocuments=useRef(new Map<string,StatementSourceDetails|null>());
  async function printReport(){
    printDocuments.current=new Map();
    await fullPrint.print(async(page,signal)=>{
      const result=await reportsService.returns({...query,page,limit:100},signal);
      const keys=[...new Set(result.activity.items.map(row=>row.return_id?row.return_type+':'+row.return_id:'').filter(Boolean))].filter(key=>!printDocuments.current.has(key));
      for(let i=0;i<keys.length;i+=4)await Promise.all(keys.slice(i,i+4).map(async key=>{const [kind,id]=key.split(':');printDocuments.current.set(key,await reportDocumentProducts(kind as 'Order'|'SalesReturn'|'PurchaseReturn',Number(id),signal));}));
      return result;
    },'تقرير المردودات');
  }


  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    reportsService.returns(query, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(apiMessages(reason, 'تعذر تحميل تقرير المردودات.').join('، ')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query]);
  const reset = () => { setDraft({...blank,...currentMonth()}); setQuery({page:1,limit:20,group_by:'day',date_from:currentMonth().from,date_to:currentMonth().to}); };
  const page = data?.activity.pagination;
  const period = data ? `${data.period.date_from} — ${data.period.date_to}` : '';
  return <div className="report-page mx-auto max-w-[1450px] space-y-4 pb-10" dir="rtl">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير المردودات</h1>
      <details className="report-note mt-2"><summary>كيف تقرأ التقرير؟</summary><p className="mt-2 text-sm text-stone-600">مردودات البيع والشراء والإلغاءات خلال الفترة. يظهر حساب كل حركة وكميتها ومبلغها، وحالة المردود الآن.</p></details></header>
    <form className="rounded-xl border bg-white p-4" onSubmit={event=>{event.preventDefault();if(draft.from&&draft.to&&draft.from>draft.to){setError('تاريخ البداية يجب أن يسبق تاريخ النهاية.');return;}setQuery(current=>({...current,date_from:draft.from||undefined,date_to:draft.to||undefined,page:1}));}}><div className="grid items-end gap-3 sm:grid-cols-[200px_200px_auto] sm:justify-start"><RepDateInput label="من تاريخ" value={draft.from} max={draft.to||undefined} onChange={from=>setDraft(v=>({...v,from}))}/><RepDateInput label="إلى تاريخ" value={draft.to} min={draft.from||undefined} onChange={to=>setDraft(v=>({...v,to}))}/><div className="flex flex-wrap gap-2"><button className="btn-primary">تطبيق</button><button type="button" className="btn-outline" onClick={reset}>إعادة ضبط</button><button type="button" className="btn-outline inline-flex items-center gap-2" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={()=>{setExtra({type:query.return_type??'',account:query.sale_account_id?String(query.sale_account_id):'',search:query.search??'',classification:query.commercial_classification});setFiltersOpen(true);}}><SlidersHorizontal size={16} aria-hidden/>الفلاتر{[query.return_type,query.sale_account_id,query.search,query.commercial_classification].filter(Boolean).length?` (${[query.return_type,query.sale_account_id,query.search,query.commercial_classification].filter(Boolean).length})`:''}</button>{data&&<button type="button" className="btn-outline" disabled={loading || fullPrint.printing} onClick={()=>void printReport()}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>}</div></div></form>
    <Modal open={filtersOpen} onClose={()=>setFiltersOpen(false)} title="فلاتر تقرير المردودات" className="filters-drawer" footer={<div dir="rtl" className="grid grid-cols-2 gap-3"><button type="button" className="btn-primary" onClick={()=>{setQuery(current=>({...current,return_type:(extra.type||undefined) as ReturnsReportQuery['return_type'],sale_account_id:extra.account?Number(extra.account):undefined,search:extra.search.trim()||undefined,commercial_classification:extra.classification,page:1}));setFiltersOpen(false);}}>تطبيق الفلاتر</button><button type="button" className="btn-outline" onClick={()=>setExtra({type:'',account:'',search:''})}>مسح الكل</button></div>}><div dir="rtl" className="space-y-5"><p className="text-sm text-stone-500">حدّد خياراتك، ثم اضغط تطبيق لتحديث النتائج.</p><Select label="نوع المردود" value={extra.type} onChange={type=>setExtra(v=>({...v,type}))} options={[["","كل الأنواع"],["SalesReturn",typeName.SalesReturn],["PurchaseReturn",typeName.PurchaseReturn]]}/><CommercialClassificationFilter value={extra.classification} onChange={classification=>setExtra(v=>({...v,classification,account:''}))}/><FinancialAccountFilter key={extra.classification??'all'} classification={extra.classification} value={extra.account} onChange={account=>setExtra(v=>({...v,account}))}/><label className="block"><span className="rep-label">رقم المرجع</span><input className="rep-control" value={extra.search} onChange={event=>setExtra(v=>({...v,search:event.target.value}))} placeholder="رقم المردود أو الشراء"/></label></div></Modal>
    {data?.filter_scope === 'known_metadata_only' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">بعض الفلاتر تحتاج بيانات المستند أو الطلب. تظل الحركة ذات البيانات المفقودة في التقرير غير المفلتر ضمن «غير متاح».</p>}
    {fullPrint.printError && <p role="alert" className="rep-error">{fullPrint.printError}</p>}
    {error && <p className="rep-error" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border bg-white p-5">جارٍ تحميل التقرير…</p>}
    {!loading && data && <>

      <article ref={printRef} className="print-document space-y-5 rounded-2xl border bg-white p-4 sm:p-6">
        <PrintHeader company={null} title="تقرير المردودات" subtitle={`الفترة: ${period} · صفحة الحركات ${page?.page ?? 1}`} />
        <div className="print-summary grid gap-3 sm:grid-cols-3"><Metric label="إجمالي المردودات" value={data.summary.gross_returns} /><Metric label="إلغاءات المردودات" value={data.summary.return_reversals} /><Metric label="صافي المردودات" value={data.summary.net_returns} /></div>
        <section><h2 className="mb-3 text-lg font-black text-brand">تفاصيل العمليات</h2>
          <div className="print-active hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-sm"><thead><tr className="bg-stone-100">{['التاريخ', fullPrint.printData?'رقم المردود':'الحركة / رقم المستند', 'نوع المردود', 'الحساب / المنفذ', fullPrint.printData?'الكمية':'الكمية الحالية / الحالة', 'المبلغ'].map((label) => <th key={label} className="border p-2 text-right">{label}</th>)}</tr></thead><tbody>{data.activity.items.map((row) => <Fragment key={row.journal_entry_id}><tr><td className="border p-2">{localDate(row.occurred_at)}</td><td className="border p-2">{(!fullPrint.printData||row.kind!=='Return')&&<b>{row.kind === 'Return' ? 'مردود' : 'إلغاء أثر مردود'}</b>}<small className="block text-stone-500">{fullPrint.printData?(row.return_id?'#'+row.return_id:'—'):reference(row)}</small>{row.return_id && <Link data-print-ignore className="block text-brand underline" to={row.return_type === 'SalesReturn' ? `/owner/returns?return=${row.return_id}` : `/owner/account-sources/PurchaseReturn/${row.return_id}`}>عرض التفاصيل ↗</Link>}</td><td className="border p-2">{typeName[row.return_type]}</td><td className="border p-2">{row.sale_account_name ?? '—'}<small className="block text-stone-500">نفّذ الحركة: {row.actor?.name ?? 'غير متاح'}</small></td><td className="border p-2">{row.quantity ?? '—'} قطعة{!fullPrint.printData&&<small className="block">المستند حاليًا: {row.current_document_status === 'Cancelled' ? 'ملغى' : row.current_document_status === 'Active' ? 'فعال' : 'غير متاح'}</small>}</td><td className="border p-2 font-bold"><ReportAmount value={row.net_effect} /></td></tr>{fullPrint.printData&&<tr data-report-detail-row><td colSpan={6}><div className="p-2">{printDocuments.current.get(row.return_id?row.return_type+':'+row.return_id:'')?<StatementSourceDetailsView details={printDocuments.current.get(row.return_id?row.return_type+':'+row.return_id:'')!} showHeading={false} customerPrint reportPrint/>:<p className="text-xs text-stone-500">تفاصيل منتجات المستند غير متاحة؛ الحركة المالية محفوظة.</p>}</div></td></tr>}</Fragment>)}</tbody></table></div>
          <div className="report-mobile-cards space-y-2 md:hidden print:hidden">{data.activity.items.map((row) => <div key={row.journal_entry_id} className="rounded-xl border p-3 text-sm"><div className="flex justify-between gap-2"><b>{row.kind === 'Return' ? 'مردود' : 'إلغاء أثر مردود'} · {typeName[row.return_type]}</b><b><ReportAmount value={row.net_effect} /></b></div><p>{localDate(row.occurred_at)} · {reference(row)}</p><p>الحساب: {row.sale_account_name ?? 'غير متاح'}</p>{row.return_id && <Link className="text-brand underline" to={row.return_type === 'SalesReturn' ? `/owner/returns?return=${row.return_id}` : `/owner/account-sources/PurchaseReturn/${row.return_id}`}>عرض التفاصيل ↗</Link>}</div>)}</div>
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
