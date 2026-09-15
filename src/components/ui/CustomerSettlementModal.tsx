import { useEffect, useState } from "react";
import { customersService, type CustomerSettlementResponseDto, type PaymentMethod } from "@/api";
import Modal from "./Modal";
import { apiMessages, formatMoney } from "@/components/rep/repOrderUtils";
import Select from "./Select";

export default function CustomerSettlementModal({ customer, onClose, onChanged }: { customer: { id: number; name: string; phone: string } | null; onClose: () => void; onChanged: (result: CustomerSettlementResponseDto) => void }) {
  const [debt, setDebt] = useState(0); const [amount, setAmount] = useState(""); const [method, setMethod] = useState<PaymentMethod>("Cash"); const [check, setCheck] = useState(""); const [notes, setNotes] = useState(""); const [errors, setErrors] = useState<string[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!customer) return; const c = new AbortController(); setErrors([]); customersService.findByPhone(customer.phone, c.signal).then((r) => setDebt(Number(r.customer.total_outstanding_amount))).catch((e) => { if (!c.signal.aborted) setErrors(apiMessages(e, "تعذر تحميل إجمالي الدين.")); }); return () => c.abort(); }, [customer]);
  if (!customer) return null;
  const submit = async () => { const value = Number(amount); if (!Number.isFinite(value) || value <= 0) return setErrors(["أدخل مبلغ تحصيل صحيحًا."]); if (value > debt) return setErrors(["مبلغ التحصيل لا يمكن أن يتجاوز إجمالي الدين الحالي."]); if (method === "Check" && !check.trim()) return setErrors(["رقم الشيك مطلوب عند اختيار الدفع بالشيك."]); setLoading(true); setErrors([]); try { const result = await customersService.settle(customer.id, { amount: value, payment_method: method, check_number: method === "Check" ? check.trim() : undefined, notes: notes.trim() || undefined }); onChanged(result); } catch (e) { setErrors(apiMessages(e, "تعذر تسجيل التحصيل.")); } finally { setLoading(false); } };
  return <Modal open onClose={onClose} title="تحصيل دفعة من الزبون"><div className="space-y-4">
    <div className="rounded-xl bg-stone-50 p-4"><b className="block text-brand">{customer.name}</b><span dir="ltr" className="text-sm text-stone-500">{customer.phone}</span><p className="mt-3 text-lg font-black text-red-700">إجمالي الدين: {formatMoney(debt)}</p></div>
    {errors.length > 0 && <div role="alert" className="rep-error">{errors.join("، ")}</div>}
    <label><span className="rep-label">مبلغ التحصيل</span><input className="rep-control" type="number" min="0.01" max={debt} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    <Select label="طريقة الدفع" value={method} onChange={setMethod} options={[{ value: "Cash", label: "نقدًا" }, { value: "Check", label: "شيك" }]} />
    {method === "Check" && <label><span className="rep-label">رقم الشيك</span><input className="rep-control" value={check} onChange={(e) => setCheck(e.target.value)} /></label>}
    <label><span className="rep-label">ملاحظات (اختياري)</span><textarea className="rep-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>إلغاء</button><button type="button" disabled={loading || debt <= 0} className="btn-primary disabled:opacity-50" onClick={() => void submit()}>{loading ? "جاري التحصيل…" : "تأكيد التحصيل"}</button></div>
  </div></Modal>;
}
