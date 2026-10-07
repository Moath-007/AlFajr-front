import { useReportPrint } from '@/components/reports/useReportPrint';
import PrintHeader from '@/components/printing/PrintHeader';
import { ReportAmount } from '@/components/reports/ReportControls';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { currentMonth } from '@/components/finance/accountUiUtils';
interface Report {
  summary: { increases: string; decreases: string; net: string };
  items: Array<{ journal_entry_id:number; occurred_at:string; account_id:number; account_name:string;
    source_type:string|null; source_id:number|null; notes:string|null; effect:string; reversal:boolean }>;
  pagination: {total:number;total_pages:number};
}
export default function FinancialActivityReportPage({type}:{type:'purchases'|'disbursements'}) {
  const [period,setPeriod]=useState(currentMonth);
  const [page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [loadedData,setData]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');
    const q=new URLSearchParams({date_from:period.from,date_to:period.to,page:String(page),limit:'20'});
    apiClient.get<Report>(`/reports/${type}?${q}`,{signal:c.signal}).then(r=>{if(!c.signal.aborted)setData(r);})
      .catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل التقرير.').join('، '));})
      .finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();
  },[type,period,page,revision]);
  const title=type==='purchases'?'المشتريات':'الصرف';
  const printRef = useRef<HTMLElement>(null);
  const printQuery = { date_from: period.from, date_to: period.to };
  const fullPrint = useReportPrint<Report>(printRef, printQuery);
  const data = fullPrint.printData ?? loadedData;
  return <main dir="rtl" className="mx-auto max-w-6xl space-y-4">
    <Link to="/owner/reports" className="text-sm font-bold text-gold-dark">← التقارير</Link>
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير {title}</h1><p className="mt-2 text-sm text-stone-600">المشتريات أو سندات الصرف خلال الفترة، مع توضيح الإلغاءات والتعديلات. المبالغ حسب الحركات المالية المسجلة.</p></header>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <label><span className="rep-label">من</span><input type="date" className="rep-control" value={period.from} onChange={e=>{setPeriod(p=>({...p,from:e.target.value}));setPage(1);}}/></label>
      <label><span className="rep-label">إلى</span><input type="date" className="rep-control" value={period.to} onChange={e=>{setPeriod(p=>({...p,to:e.target.value}));setPage(1);}}/></label>
      <button className="btn-outline" disabled={loading} onClick={()=>setRevision(r=>r+1)}>تحديث</button>
    </div>
    {fullPrint.printError && <p className="rep-error" role="alert">{fullPrint.printError}</p>}
    {error&&<p className="rep-error" role="alert">{error}</p>}
    {loading?<p role="status">جارٍ تحميل التقرير…</p>:!error&&data&&<>
      <button className="btn-outline" disabled={fullPrint.printing} onClick={() => void fullPrint.print((next, signal) => apiClient.get<Report>('/reports/' + type + '?' + new URLSearchParams({ ...printQuery, page: String(next), limit: '100' }), { signal }), 'تقرير ' + title)}>{fullPrint.printing ? 'جارٍ تجهيز الطباعة…' : 'طباعة التقرير كاملًا / PDF'}</button>
      <article ref={printRef} className="print-document space-y-4">
      <PrintHeader company={null} title={'تقرير ' + title} />
      <div className="grid gap-3 sm:grid-cols-3">{[['المبالغ المسجلة',data.summary.increases],['الإلغاءات والتعديلات',data.summary.decreases],['المبلغ بعد الإلغاءات',data.summary.net]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p>{label}</p><b><ReportAmount value={value} /></b></div>)}</div>
      <div className="divide-y rounded-xl border bg-white">{data.items.length?data.items.map(row=><article key={row.journal_entry_id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div><Link to={`/owner/accounts/${row.account_id}/statement`} className="font-bold text-brand">{row.account_name}</Link><p className="break-words text-sm text-stone-500">حركة #{row.journal_entry_id}{row.reversal?' · إلغاء / استعادة':''} · {row.notes}</p>{row.source_id && (row.source_type === 'CustomerPurchase' || row.source_type === 'Payment') && <Link data-print-ignore className="text-brand underline text-sm" to={row.source_type === 'CustomerPurchase' ? `/owner/purchases?purchase=${row.source_id}` : `/owner/account-sources/Payment/${row.source_id}`}>عرض التفاصيل ↗</Link>}</div>
        <time>{new Date(row.occurred_at).toLocaleDateString('ar-EG-u-nu-latn',{timeZone:'Asia/Hebron'})}</time><b dir="ltr"><ReportAmount value={row.effect} /></b>
      </article>):<p className="p-6 text-center">لا توجد حركات في الفترة.</p>}</div>
      </article>
      <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</button><span>{page} / {data.pagination.total_pages||1} · {data.pagination.total} حركة</span><button className="btn-outline" disabled={page>=data.pagination.total_pages} onClick={()=>setPage(p=>p+1)}>التالي</button></div>
    </>}
  </main>;
}
