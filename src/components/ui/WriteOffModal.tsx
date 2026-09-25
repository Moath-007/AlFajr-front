import { useEffect, useState } from "react";
import { writeOffsService } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import Modal from "./Modal";

export default function WriteOffModal({ customerId, maxAmount, onClose, onSaved }: { customerId: number | null; orderId?: number; maxAmount?: number; onClose: () => void; onSaved: (message: string) => void }) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => { if (customerId !== null) { setAmount(""); setNotes(""); setErrors([]); } }, [customerId]);
  if (customerId === null) return null;
  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setErrors(["أدخل مبلغ مسامحة صحيحًا."]);
    if (maxAmount !== undefined && value > maxAmount + 0.001) return setErrors(["مبلغ المسامحة لا يمكن أن يتجاوز المبلغ المطلوب من الزبون."]);
    setSaving(true); setErrors([]);
    try {
      const result = await writeOffsService.create(customerId, { amount: value, notes: notes.trim() || undefined });
      onSaved(result.message);
    } catch (error) { setErrors(apiMessages(error, "تعذر تسجيل المسامحة.")); }
    finally { setSaving(false); }
  };
  return <Modal open onClose={onClose} title="مسامحة على حساب الزبون"><div className="space-y-4">
    {errors.length > 0 && <div className="rep-error">{errors.join("، ")}</div>}
    {maxAmount !== undefined && <p className="rounded-xl bg-stone-50 p-3 text-sm font-bold">المطلوب من الزبون: {maxAmount.toFixed(2)}</p>}
    <label><span className="rep-label">مبلغ المسامحة</span><input className="rep-control" type="number" min="0.01" max={maxAmount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)}/></label>
    <label><span className="rep-label">سبب أو ملاحظات</span><textarea className="rep-control" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
    <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>إلغاء</button><button type="button" className="btn-primary" disabled={saving} onClick={() => void submit()}>{saving ? "جاري التسجيل…" : "تسجيل المسامحة"}</button></div>
  </div></Modal>;
}
