import { Fragment, useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import type { CurrencyDto, PaymentMethod } from "@/api";
import { RepDateInput, RepSelect } from "@/components/rep/RepFormControls";

export interface PaymentDraftTableRow {
  key: string | number;
  amount: string;
  currencyId: string;
  rate: string;
  method: PaymentMethod;
  paidAt: string;
  notes: string;
  checkNumber: string;
  accountNumber: string;
  bankNumber: string;
  branchNumber: string;
  dueDate: string;
}
import "./PaymentDraftTable.css";
import DraftCheckPopover from "./DraftCheckPopover";

type PaymentDraftTableChange = Partial<Omit<PaymentDraftTableRow, "key">>;

export default function PaymentDraftTable({ rows, currencies, onChange, onRemove, scrollable = false }: { scrollable?: boolean; rows: PaymentDraftTableRow[]; currencies: CurrencyDto[]; onChange: (index: number, change: PaymentDraftTableChange) => void; onRemove: (index: number) => void }) {
  const [openNotes, setOpenNotes] = useState<Set<string | number>>(new Set());
  const toggleNote = (key: string | number) => setOpenNotes((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const hasCheck = rows.some(row => row.method === "Check");
  const inputClass = "rep-control tabular-nums";
  return <div className={`payment-drafts rounded-xl border border-stone-200 ${scrollable ? "payment-drafts-scroll" : ""}`} tabIndex={scrollable ? 0 : undefined} role={scrollable ? "region" : undefined} aria-label={scrollable ? "جدول الدفعات والشيكات" : undefined}>
    <table className={`payment-draft-table ${hasCheck ? "" : "draft-cash-only"}`} aria-label="دفعات السند">
      <thead><tr><th className="draft-number">#</th><th className="draft-amount">المبلغ</th><th className="draft-currency">العملة</th><th className="draft-rate">سعر الصرف</th><th className="draft-method">الطريقة</th><th className="draft-date">تاريخ السند</th>{hasCheck && <><th className="draft-check-details">بيانات الشيك</th><th className="draft-date">الاستحقاق</th></>}<th className="draft-actions">الإجراءات</th></tr></thead>
      <tbody>{rows.map((row,index)=>{const check=row.method==="Check",currency=currencies.find(item=>item.currency_id===Number(row.currencyId)),noteOpen=openNotes.has(row.key);return <Fragment key={row.key}>
        <tr className="draft-main-row">
          <td className="draft-index" data-label="دفعة">{index+1}</td>
          <td data-label="المبلغ"><input aria-label={`مبلغ الدفعة ${index+1}`} className={inputClass} type="number" inputMode="decimal" min="0.01" step="0.01" value={row.amount} onChange={event=>onChange(index,{amount:event.target.value})}/></td>
          <td data-label="العملة"><RepSelect floating={scrollable} label={`عملة الدفعة ${index+1}`} value={row.currencyId} options={currencies.map(item=>({value:String(item.currency_id),label:item.code}))} onChange={currencyId=>onChange(index,{currencyId,...(currencies.find(item=>item.currency_id===Number(currencyId))?.is_base?{rate:"1"}:{})})}/></td>
          <td data-label="سعر الصرف">{currency?.is_base?<span className="text-sm text-stone-400">1 · أساسية</span>:<input aria-label={`سعر صرف الدفعة ${index+1}`} className={inputClass} type="number" inputMode="decimal" min="0.000001" step="0.000001" value={row.rate} onChange={event=>onChange(index,{rate:event.target.value})}/>}</td>
          <td data-label="الطريقة"><RepSelect floating={scrollable} label={`طريقة الدفعة ${index+1}`} value={row.method} options={[{value:"Cash",label:"نقدًا"},{value:"Check",label:"شيك"}]} onChange={method=>onChange(index,{method})}/></td>
          <td data-label="تاريخ السند"><RepDateInput label={`تاريخ السند ${index+1}`} value={row.paidAt} onChange={paidAt=>onChange(index,{paidAt})}/></td>
          {hasCheck && <>
            <td className={`draft-check-details-cell ${check ? "" : "draft-irrelevant"}`} data-label="بيانات الشيك">{check && <DraftCheckPopover row={row} index={index} onChange={change=>onChange(index,change)} />}</td>
            <td className={check ? "" : "draft-irrelevant"} data-label="الاستحقاق">{check && <RepDateInput label={`استحقاق الدفعة ${index+1}`} value={row.dueDate} onChange={dueDate=>onChange(index,{dueDate})}/>}</td>
          </>}
          <td className="draft-actions-cell" data-label="الإجراءات"><div className="flex gap-1"><button type="button" onClick={()=>toggleNote(row.key)} aria-expanded={noteOpen} aria-label={`ملاحظة الدفعة ${index+1}`} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${row.notes?"bg-gold/15 text-gold-dark":"text-stone-500 hover:bg-stone-100"}`}><MessageSquareText className="h-4 w-4" /></button><button type="button" onClick={()=>onRemove(index)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold" aria-label={`حذف السند ${index+1}`}><Trash2 className="h-4 w-4" /></button></div></td>
        </tr>
        {noteOpen&&<tr className="draft-detail-row"><td colSpan={hasCheck ? 9 : 7}><div className="grid min-w-0 gap-2"><label><span className="rep-label">ملاحظة الدفعة {index+1}</span><textarea autoFocus className="rep-control resize-y" rows={2} value={row.notes} onChange={event=>onChange(index,{notes:event.target.value})}/></label><button type="button" className="btn-ghost min-h-11 w-fit" onClick={()=>toggleNote(row.key)}>إغلاق الملاحظة</button></div></td></tr>}
      </Fragment>;})}</tbody>
    </table>
    {!rows.length&&<p role="status" className="p-6 text-center text-sm text-stone-500">لا توجد دفعات. أضف دفعة أو شيكًا.</p>}
  </div>;
}


