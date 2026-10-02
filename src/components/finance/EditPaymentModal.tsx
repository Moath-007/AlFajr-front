import { useEffect, useState } from 'react';
import { currenciesService, paymentsService, type CurrencyDto, type PaymentDto } from '@/api';
import { apiMessages } from '@/components/rep/repOrderUtils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Check corrections use ChecksService and its state/history rules, not Payment replacement.
export default function EditPaymentModal({payment,onClose,onSaved}:{payment:PaymentDto;onClose:()=>void;onSaved:(id:number)=>void}) {
  const [currencies,setCurrencies]=useState<CurrencyDto[]>([]),[error,setError]=useState('');
  const [amount,setAmount]=useState(payment.amount),[rate,setRate]=useState(payment.exchange_rate??'1');
  const [currencyId,setCurrencyId]=useState(payment.currency?.currency_id??0);
  const [date,setDate]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(payment.paid_at))),[notes,setNotes]=useState(payment.notes??'');
  const [review,setReview]=useState(false),[saving,setSaving]=useState(false);
  useEffect(()=>{const c=new AbortController();currenciesService.list(c.signal).then(r=>{
    const rows=Array.isArray(r)?r:r.items??r.currencies??[];setCurrencies(rows.filter(x=>x.is_active||x.currency_id===currencyId));
  }).catch(e=>{if(!c.signal.aborted)setError(apiMessages(e,'تعذر تحميل العملات.').join('، '));});return()=>c.abort();},[currencyId]);
  const currency=currencies.find(c=>c.currency_id===currencyId);
  const validate=()=>{if(!currency||!date||!/^\d+(?:\.\d{1,2})?$/.test(amount)||Number(amount)<=0||
    !currency.is_base&&(!/^\d+(?:\.\d{1,6})?$/.test(rate)||Number(rate)<=0)){setError('راجع التاريخ والمبلغ والعملة وسعر الصرف.');return;}setError('');setReview(true);};
  const save=async()=>{if(!currency||saving)return;setSaving(true);setError('');try{
    const result=await paymentsService.update(payment.id,{amount:Number(amount),currency_id:currencyId,
      exchange_rate:currency.is_base?1:Number(rate),payment_method:'Cash',paid_at:date,notes:notes.trim()});
    onSaved(result.payment_id);
  }catch(e){setError(apiMessages(e,'تعذر تصحيح السند.').join('، '));setReview(false);}finally{setSaving(false);}};
  return <><Modal open onClose={saving?()=>undefined:onClose} title={`تصحيح السند #${payment.voucher_number}`} size="lg">
    <div className="space-y-4" dir="rtl"><p className="text-sm text-stone-600">يُعكس السند الأصلي ويُنشأ سند بديل على نفس General وحساب النقد/البنك، مع حفظ التاريخ.</p>
      {error&&<p className="rep-error" role="alert">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2"><label><span className="rep-label">المبلغ</span><input className="rep-control" value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" /></label>
        <label><span className="rep-label">العملة</span><select className="rep-control" value={currencyId} onChange={e=>setCurrencyId(Number(e.target.value))}>{currencies.map(c=><option key={c.currency_id} value={c.currency_id}>{c.code} — {c.name}</option>)}</select></label>
        {!currency?.is_base&&<label><span className="rep-label">سعر الصرف</span><input className="rep-control" value={rate} onChange={e=>setRate(e.target.value)} inputMode="decimal" /></label>}
        <label><span className="rep-label">تاريخ السند</span><input className="rep-control" type="date" value={date} onChange={e=>setDate(e.target.value)} /></label></div>
      <label className="block"><span className="rep-label">ملاحظات</span><textarea className="rep-control" value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      <button className="btn-primary" disabled={saving||!currency} onClick={validate}>مراجعة التصحيح</button>
    </div></Modal>
    <ConfirmDialog open={review} onClose={()=>setReview(false)} onConfirm={()=>void save()} loading={saving} severity="normal" title="تأكيد تصحيح السند" message="سيُعكس الأثر الأصلي ويُرحّل السند البديل مرة واحدة." />
  </>;
}
