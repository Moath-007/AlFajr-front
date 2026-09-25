import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, RefreshCw } from "lucide-react";
import { currenciesService, type CurrencyDto } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";

export default function CurrencySettings({ onNotify }: { onNotify: (message: string, type?: "success" | "error" | "info") => void }) {
  const [items, setItems] = useState<CurrencyDto[]>([]);
  const [fields, setFields] = useState({ code: "", name: "", symbol: "" });
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [errors, setErrors] = useState<string[]>([]);
  const load = useCallback(async (signal?: AbortSignal) => { setLoading(true); try { const response = await currenciesService.list(signal); setItems(Array.isArray(response) ? response : response.items ?? response.currencies ?? []); } catch (error) { if (!signal?.aborted) setErrors(apiMessages(error, "تعذر تحميل العملات.")); } finally { if (!signal?.aborted) setLoading(false); } }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const create = async () => {
    if (!fields.code.trim() || !fields.name.trim() || !fields.symbol.trim()) return setErrors(["رمز العملة واسمها ورمز العرض مطلوبة."]);
    setSaving(true); setErrors([]);
    try { const response = await currenciesService.create({ code: fields.code.trim().toUpperCase(), name: fields.name.trim(), symbol: fields.symbol.trim() }); setFields({ code: "", name: "", symbol: "" }); onNotify(response.message, "success"); await load(); }
    catch (error) { setErrors(apiMessages(error, "تعذر إضافة العملة.")); }
    finally { setSaving(false); }
  };
  return <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2"><Coins className="h-5 w-5 text-gold-dark"/><div><h2 className="font-black text-brand">العملات</h2><p className="text-sm text-stone-500">العملات المضافة تظهر مباشرة في نماذج الدفعات مع حقل سعر الصرف.</p></div></div>
    {errors.length > 0 && <div className="rep-error mt-4">{errors.join("، ")}</div>}
    <div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="رمز العملة" placeholder="USD" value={fields.code} onChange={(code) => setFields({ ...fields, code })}/><Field label="اسم العملة" placeholder="دولار أمريكي" value={fields.name} onChange={(name) => setFields({ ...fields, name })}/><Field label="رمز العرض" placeholder="$" value={fields.symbol} onChange={(symbol) => setFields({ ...fields, symbol })}/></div>
    <button type="button" disabled={saving} className="btn-primary mt-3 inline-flex items-center gap-2" onClick={() => void create()}><Plus className="h-4 w-4"/>{saving ? "جاري الإضافة…" : "إضافة عملة"}</button>
    <div className="mt-5 border-t pt-4">{loading ? <p className="text-sm text-stone-500">جاري تحميل العملات…</p> : items.length === 0 ? <button className="inline-flex items-center gap-2" onClick={() => void load()}><RefreshCw className="h-4 w-4"/> إعادة المحاولة</button> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((currency) => <div key={currency.currency_id} className="flex items-center justify-between rounded-xl bg-stone-50 p-3"><div><b className="text-brand">{currency.code} · {currency.symbol}</b><p className="text-xs text-stone-500">{currency.name}</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${currency.is_active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>{currency.is_base ? "أساسية" : currency.is_active ? "فعالة" : "متوقفة"}</span></div>)}</div>}</div>
  </section>;
}
function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) { return <label><span className="rep-label">{label}</span><input className="rep-control" dir="auto" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)}/></label>; }
