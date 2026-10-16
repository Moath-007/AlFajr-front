import { purchasesService, type PurchaseDto } from '@/api';
import { ApiError } from '@/api/errors';
import { formatMoney } from '@/components/rep/repOrderUtils';
import Modal from '@/components/ui/Modal';
import { RepDateInput } from '@/components/rep/RepFormControls';
import { SlidersHorizontal } from 'lucide-react';
import '@/components/reports/ReportsLayout.css';
import CommercialClassificationFilter from '@/components/finance/CommercialClassificationFilter';
import { useReportPrint } from '@/components/reports/useReportPrint';
import PrintHeader from '@/components/printing/PrintHeader';
import { ReportAmount } from '@/components/reports/ReportControls';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { currentMonth } from '@/components/finance/accountUiUtils';
interface Report {
  summary: { increases: string; decreases: string; net: string };
  items: Array<{ journal_entry_id:number; occurred_at:string; account_id:number; account_name:string;
    source_type:string|null; source_id:number|null; notes:string|null; effect:string; reversal:boolean; purchase?:PurchaseDto|null }>;
  pagination: {total:number;total_pages:number};
}
export default function FinancialActivityReportPage({type}:{type:'purchases'|'disbursements'}) {
  const [classification,setClassification]=useState<'Customer'|'Supplier'|undefined>();
  const [period,setPeriod]=useState(currentMonth);
  const [draftPeriod,setDraftPeriod]=useState(currentMonth);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [draftClassification,setDraftClassification]=useState<'Customer'|'Supplier'|undefined>();
  const dateError=draftPeriod.from&&draftPeriod.to&&draftPeriod.from>draftPeriod.to?'تاريخ البداية يجب أن يسبق تاريخ النهاية.':'';
  const [page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [loadedData,setData]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setData(null);
    const q=new URLSearchParams({date_from:period.from,date_to:period.to,page:String(page),limit:'20'});if(classification)q.set('commercial_classification',classification);
    apiClient.get<Report>(`/reports/${type}?${q}`,{signal:c.signal}).then(r=>{if(!c.signal.aborted)setData(r);})
      .catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل التقرير.').join('، '));})
      .finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();
  },[type,period,page,revision,classification]);
  const title=type==='purchases'?'المشتريات':'الصرف';
  const printRef = useRef<HTMLElement>(null);
  const printQuery = { date_from: period.from, date_to: period.to,...(classification?{commercial_classification:classification}:{}) };
  const fullPrint = useReportPrint<Report>(printRef, printQuery);
  const data = fullPrint.printData ?? loadedData;
  async function printReport(){
    const documents=new Map<number,PurchaseDto|null>();
    await fullPrint.print(async(next,signal)=>{
      const report=await apiClient.get<Report>('/reports/'+type+'?'+new URLSearchParams({...printQuery,page:String(next),limit:'100'}),{signal});
      if(type!=='purchases')return report;
      const ids=[...new Set(report.items.filter(row=>row.source_type==='CustomerPurchase'&&row.source_id).map(row=>row.source_id!))].filter(id=>!documents.has(id));
      for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{try{documents.set(id,await purchasesService.getById(id,signal));}catch(error){if(error instanceof ApiError&&error.status===404)documents.set(id,null);else throw error;}}));
      return {...report,items:report.items.map(row=>({...row,...(row.source_type==='CustomerPurchase'&&row.source_id?{purchase:documents.get(row.source_id)??null}:{})}))};
    },'تقرير '+title);
  }

  return <main dir="rtl" className="report-page mx-auto max-w-[1450px] space-y-4">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير {title}</h1><details className="report-note mt-2"><summary>كيف تقرأ التقرير؟</summary><p className="mt-2 text-sm text-stone-600">المشتريات أو سندات الصرف خلال الفترة، مع توضيح الإلغاءات والتعديلات. المبالغ حسب الحركات المالية المسجلة.</p></details></header>
    <form className="rounded-xl border bg-white p-4" onSubmit={event=>{event.preventDefault();if(dateError)return;setPeriod({...draftPeriod});setPage(1);setRevision(r=>r+1);}}><div className="grid items-end gap-3 sm:grid-cols-[200px_200px_auto] sm:justify-start"><RepDateInput label="من تاريخ" value={draftPeriod.from} max={draftPeriod.to||undefined} onChange={from=>setDraftPeriod(v=>({...v,from}))}/><RepDateInput label="إلى تاريخ" value={draftPeriod.to} min={draftPeriod.from||undefined} onChange={to=>setDraftPeriod(v=>({...v,to}))}/><div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={!!dateError}>تطبيق</button><button type="button" className="btn-outline" onClick={()=>{const initial=currentMonth();setDraftPeriod(initial);setPeriod(initial);setClassification(undefined);setPage(1);}}>إعادة ضبط</button><button type="button" className="btn-outline inline-flex items-center gap-2" aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={()=>{setDraftClassification(classification);setFiltersOpen(true);}}><SlidersHorizontal size={16} aria-hidden/>الفلاتر{classification?' (1)':''}</button>{data&&<button type="button" className="btn-outline" disabled={fullPrint.printing} onClick={()=>void printReport()}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>}</div></div></form>
    {dateError&&<p role="alert" className="rep-error">{dateError}</p>}
    <Modal open={filtersOpen} onClose={()=>setFiltersOpen(false)} title={'فلاتر تقرير '+title} className="filters-drawer" footer={<div dir="rtl" className="grid grid-cols-2 gap-3"><button type="button" className="btn-primary" onClick={()=>{setClassification(draftClassification);setPage(1);setFiltersOpen(false);}}>تطبيق الفلاتر</button><button type="button" className="btn-outline" onClick={()=>setDraftClassification(undefined)}>مسح الكل</button></div>}><div dir="rtl" className="space-y-5"><p className="text-sm text-stone-500">حدّد خياراتك، ثم اضغط تطبيق لتحديث النتائج.</p><CommercialClassificationFilter value={draftClassification} onChange={setDraftClassification}/></div></Modal>
    {fullPrint.printError && <p className="rep-error" role="alert">{fullPrint.printError}</p>}
    {error&&<p className="rep-error" role="alert">{error}</p>}
    {loading?<p role="status">جارٍ تحميل التقرير…</p>:!error&&data&&<>

      <article ref={printRef} className="print-document space-y-5 rounded-xl border bg-white p-4 sm:p-6">
      <PrintHeader company={null} title={'تقرير ' + title} />
      <div className="grid gap-3 sm:grid-cols-3">{[[type==='purchases'?'المشتريات المسجّلة بالفترة':'الصرف المسجّل بالفترة',data.summary.increases],['الإلغاءات والتصحيحات',data.summary.decreases],[type==='purchases'?'صافي المشتريات':'صافي الصرف',data.summary.net]].map(([label,value])=><div key={label} className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">{label}</p><b className="mt-2 block text-xl text-brand"><ReportAmount value={value} /></b></div>)}</div>
      <section className="border-t pt-4"><h2 className="mb-4 font-bold text-brand">تفاصيل العمليات</h2><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-stone-50 text-xs text-stone-600"><tr>{['التاريخ',type==='purchases'?'رقم الشراء':'الحركة / رقم المستند','الحساب','المبلغ'].map(label=><th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{data.items.map(row=><Fragment key={row.journal_entry_id}><tr><td className="whitespace-nowrap px-4 py-3"><bdi>{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Hebron'}).format(new Date(row.occurred_at))}</bdi></td><td className="px-4 py-3">{fullPrint.printData&&type==='purchases'?<><bdi className="font-bold">{row.source_id?'#'+row.source_id:'—'}</bdi>{row.reversal&&<p className="mt-1 text-xs text-red-700">إلغاء / تصحيح</p>}{row.notes&&<p className="mt-1 text-xs text-stone-500">{row.notes}</p>}</>:<><b>{row.reversal?'إلغاء / تصحيح':type==='purchases'?'شراء':'صرف'}</b><p className="mt-1 text-xs text-stone-500">حركة <bdi>#{row.journal_entry_id}</bdi>{row.source_id&&<> · المستند <bdi>#{row.source_id}</bdi></>}</p>{row.notes&&<p className="mt-1 text-xs text-stone-500">{row.notes}</p>}</>}{row.source_id&&(row.source_type==='CustomerPurchase'||row.source_type==='Payment')&&<Link data-print-ignore className="mt-1 block text-xs text-brand underline" to={row.source_type==='CustomerPurchase'?'/owner/purchases?purchase='+row.source_id:'/owner/account-sources/Payment/'+row.source_id}>عرض التفاصيل ↗</Link>}</td><td className="px-4 py-3"><Link className="font-semibold text-brand" to={'/owner/accounts/'+row.account_id+'/statement'}>{row.account_name}</Link></td><td className="px-4 py-3 font-bold"><ReportAmount value={row.effect}/></td></tr>{fullPrint.printData&&type==='purchases'&&row.source_type==='CustomerPurchase'&&<tr data-report-detail-row><td colSpan={4} className="p-3">{row.purchase?<div className="space-y-2"><table data-report-keep-table className="w-full border-collapse text-right text-xs"><thead><tr>{['المنتج / الكود','المقاس / اللون','الكمية','سعر الوحدة','إجمالي البند'].map(label=><th key={label} className="border p-2">{label}</th>)}</tr></thead><tbody>{row.purchase.customer_purchase_items.map(item=><tr key={item.customer_purchase_item_id}><td className="border p-2"><b>{item.product_variants?.products?.product_name??item.product_variants?.products?.name??'منتج غير متاح'}</b><p>{item.product_variants?.products?.code??'—'}</p></td><td className="border p-2">{item.product_variants?.size??'—'} · {item.product_variants?.colors?.color_name??item.product_variants?.colors?.name??'—'}</td><td className="border p-2"><bdi>{item.quantity}</bdi></td><td className="border p-2"><bdi>{formatMoney(item.unit_price)}</bdi></td><td className="border p-2"><bdi>{formatMoney(Number(item.unit_price)*item.quantity)}</bdi></td></tr>)}</tbody></table></div>:<p className="text-xs text-stone-500">تفاصيل منتجات المستند غير متاحة؛ الحركة المالية محفوظة.</p>}</td></tr>}</Fragment>)}{!data.items.length&&<tr><td colSpan={4} className="p-8 text-center text-stone-500">لا توجد حركات في الفترة.</td></tr>}</tbody></table></div></section>
      </article>
      {data.pagination.total_pages>1&&<div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</button><span>{page} / {data.pagination.total_pages||1} · {data.pagination.total} حركة</span><button className="btn-outline" disabled={page>=data.pagination.total_pages} onClick={()=>setPage(p=>p+1)}>التالي</button></div>}
    </>}
  </main>;
}
