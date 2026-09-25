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
type PaymentDraftTableChange = Partial<Omit<PaymentDraftTableRow, "key">>;

export default function PaymentDraftTable({ rows, currencies, onChange, onRemove }: { rows: PaymentDraftTableRow[]; currencies: CurrencyDto[]; onChange: (index: number, change: PaymentDraftTableChange) => void; onRemove: (index: number) => void }) {
  const [openNotes, setOpenNotes] = useState<Set<string | number>>(new Set());
  const toggleNote = (key: string | number) => setOpenNotes((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const inputClass = "h-10 w-full rounded-lg border border-stone-200 bg-white px-2 text-xs outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10";
  return <div className="min-h-[260px] max-h-[520px] overflow-auto rounded-xl border border-stone-200">
    <table className="w-full min-w-[1380px] border-collapse text-xs">
      <thead className="sticky top-0 z-20 bg-stone-50 text-stone-600 shadow-[0_1px_0_0_rgba(0,0,0,.06)]"><tr><th className="w-11 p-2 text-center">#</th><th className="w-28 p-2 text-right">المبلغ</th><th className="w-36 p-2 text-right">العملة</th><th className="w-24 p-2 text-right">الصرف</th><th className="w-28 p-2 text-right">الطريقة</th><th className="w-44 p-2 text-right">تاريخ الدفع</th><th className="w-32 p-2 text-right">رقم الشيك</th><th className="w-32 p-2 text-right">الحساب</th><th className="w-24 p-2 text-right">البنك</th><th className="w-24 p-2 text-right">الفرع</th><th className="w-36 p-2 text-right">الاستحقاق</th><th className="w-24 p-2" /></tr></thead>
      <tbody className="divide-y divide-stone-100">{rows.map((row, index) => { const check = row.method === "Check"; const currency = currencies.find((item) => item.currency_id === Number(row.currencyId)); const noteOpen = openNotes.has(row.key); const dash = <span className="block text-center text-stone-300">—</span>; return <Fragment key={row.key}><tr className="hover:bg-stone-50/60">
        <td className="p-1.5 text-center font-black text-stone-400">{index + 1}</td>
        <td className="p-1.5"><input className={inputClass} type="number" min="0.01" step="0.01" value={row.amount} onChange={(event) => onChange(index, { amount: event.target.value })}/></td>
        <td className="p-1.5"><RepSelect value={row.currencyId} options={currencies.map((item) => ({ value: String(item.currency_id), label: item.code }))} onChange={(currencyId) => onChange(index, { currencyId, ...(currencies.find((item) => item.currency_id === Number(currencyId))?.is_base ? { rate: "1" } : {}) })}/></td>
        <td className="p-1.5">{currency?.is_base ? dash : <input className={inputClass} type="number" min="0.000001" step="0.000001" value={row.rate} onChange={(event) => onChange(index, { rate: event.target.value })}/>}</td>
        <td className="p-1.5"><RepSelect value={row.method} options={[{ value: "Cash", label: "نقدًا" }, { value: "Check", label: "شيك" }]} onChange={(method) => onChange(index, { method })}/></td>
        <td className="p-1.5"><input className={inputClass} type="datetime-local" value={row.paidAt} onChange={(event) => onChange(index, { paidAt: event.target.value })}/></td>
        <td className="p-1.5">{check ? <input className={inputClass} value={row.checkNumber} onChange={(event) => onChange(index, { checkNumber: event.target.value })}/> : dash}</td>
        <td className="p-1.5">{check ? <input className={inputClass} value={row.accountNumber} onChange={(event) => onChange(index, { accountNumber: event.target.value })}/> : dash}</td>
        <td className="p-1.5">{check ? <input className={inputClass} value={row.bankNumber} onChange={(event) => onChange(index, { bankNumber: event.target.value })}/> : dash}</td>
        <td className="p-1.5">{check ? <input className={inputClass} value={row.branchNumber} onChange={(event) => onChange(index, { branchNumber: event.target.value })}/> : dash}</td>
        <td className="p-1.5">{check ? <RepDateInput value={row.dueDate} onChange={(dueDate) => onChange(index, { dueDate })}/> : dash}</td>
        <td className="p-1.5"><div className="flex justify-center gap-1"><button type="button" onClick={() => toggleNote(row.key)} className={`relative grid h-8 w-8 place-items-center rounded-lg ${row.notes ? "bg-gold/15 text-gold-dark" : "text-stone-400 hover:bg-stone-100"}`} aria-label="ملاحظة"><MessageSquareText className="h-4 w-4" />{row.notes && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-dark" />}</button><button type="button" onClick={() => onRemove(index)} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`حذف السند ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div></td>
      </tr>{noteOpen && <tr className="bg-stone-50/70"><td colSpan={12} className="px-4 py-2"><div className="flex items-center gap-3"><span className="shrink-0 font-bold text-stone-500">ملاحظة السند</span><input autoFocus className="h-9 flex-1 rounded-lg border border-stone-200 bg-white px-3 outline-none focus:border-gold" value={row.notes} onChange={(event) => onChange(index, { notes: event.target.value })}/><button type="button" onClick={() => toggleNote(row.key)} className="text-xs font-bold text-stone-500">إغلاق</button></div></td></tr>}</Fragment>; })}</tbody>
    </table>
  </div>;
}
