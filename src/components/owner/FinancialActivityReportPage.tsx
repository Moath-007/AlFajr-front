import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { apiMessages } from '@/components/rep/repOrderUtils';
import { currentMonth } from '@/components/finance/accountUiUtils';
import { formatMoney } from '@/utils/money';
interface Report {
  summary: { increases: string; decreases: string; net: string };
  items: Array<{ journal_entry_id:number; occurred_at:string; account_id:number; account_name:string;
    source_type:string|null; source_id:number|null; notes:string|null; effect:string; reversal:boolean }>;
  pagination: {total:number;total_pages:number};
}
export default function FinancialActivityReportPage({type}:{type:'purchases'|'disbursements'}) {
  const [period,setPeriod]=useState(currentMonth);
  const [page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [data,setData]=useState<Report|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const c=new AbortController();setLoading(true);setError('');
    const q=new URLSearchParams({date_from:period.from,date_to:period.to,page:String(page),limit:'20'});
    apiClient.get<Report>(`/reports/${type}?${q}`,{signal:c.signal}).then(r=>{if(!c.signal.aborted)setData(r);})
      .catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل التقرير.').join('، '));})
      .finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();
  },[type,period,page,revision]);
  const title=type==='purchases'?'المشتريات':'الصرف';
  return <main dir="rtl" className="mx-auto max-w-6xl space-y-4">
    <header className="border-b pb-4"><h1 className="text-3xl font-black text-brand">تقرير {title}</h1><p className="mt-2 text-sm text-stone-600">نشاط دفتر اليومية بتاريخ الحركة في Asia/Hebron، بما فيه العكس والتراجع. المبالغ بالعملة الأساسية.</p></header>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
      <label><span className="rep-label">من</span><input type="date" className="rep-control" value={period.from} onChange={e=>{setPeriod(p=>({...p,from:e.target.value}));setPage(1);}}/></label>
      <label><span className="rep-label">إلى</span><input type="date" className="rep-control" value={period.to} onChange={e=>{setPeriod(p=>({...p,to:e.target.value}));setPage(1);}}/></label>
      <button className="btn-outline" disabled={loading} onClick={()=>setRevision(r=>r+1)}>تحديث</button>
    </div>
    {error&&<p className="rep-error" role="alert">{error}</p>}
    {loading?<p role="status">جارٍ تحميل التقرير…</p>:!error&&data&&<>
      <div className="grid gap-3 sm:grid-cols-3">{[['الزيادات',data.summary.increases],['التخفيضات / العكوس',data.summary.decreases],['الصافي',data.summary.net]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p>{label}</p><b>{formatMoney(value)}</b></div>)}</div>
      <div className="divide-y rounded-xl border bg-white">{data.items.length?data.items.map(row=><article key={row.journal_entry_id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div><Link to={`/owner/accounts/${row.account_id}/statement`} className="font-bold text-brand">{row.account_name}</Link><p className="break-words text-sm text-stone-500">قيد #{row.journal_entry_id}{row.reversal?' · عكس / استعادة':''} · {row.notes}</p></div>
        <time>{new Date(row.occurred_at).toLocaleDateString('ar-EG-u-nu-latn',{timeZone:'Asia/Hebron'})}</time><b dir="ltr">{formatMoney(row.effect)}</b>
      </article>):<p className="p-6 text-center">لا توجد حركات في الفترة.</p>}</div>
      <div className="flex items-center justify-center gap-3"><button className="btn-outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>السابق</button><span>{page} / {data.pagination.total_pages||1} · {data.pagination.total} حركة</span><button className="btn-outline" disabled={page>=data.pagination.total_pages} onClick={()=>setPage(p=>p+1)}>التالي</button></div>
    </>}
  </main>;
}
