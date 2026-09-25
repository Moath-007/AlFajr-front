import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CopyPlus } from "lucide-react";
import { currenciesService, customersService, paymentsService, type CreatePaymentResponseDto, type CurrencyDto, type PaymentMethod } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import { formatMoney } from "@/utils/money";
import Modal from "./Modal";
import Select from "./Select";
import ConfirmDialog from "./ConfirmDialog";
import PaymentDraftTable from "@/components/finance/PaymentDraftTable";

type PaymentDraft = {
  key: number; amount: string; currencyId: string; rate: string; method: PaymentMethod;
  paidAt: string; notes: string; checkNumber: string; accountNumber: string;
  bankNumber: string; branchNumber: string; dueDate: string;
};

let nextKey = 1;
const newDraft = (currencyId = ""): PaymentDraft => ({
  key: nextKey++, amount: "", currencyId, rate: "1", method: "Cash",
  paidAt: new Date().toISOString().slice(0, 16), notes: "", checkNumber: "",
  accountNumber: "", bankNumber: "", branchNumber: "", dueDate: "",
});

export default function CustomerSettlementModal({ customer, onClose, onChanged, amountLimit, title, direction = "Receipt" }: { customer: { id: number; name: string; phone: string } | null; onClose: () => void; onChanged: (result: CreatePaymentResponseDto) => void; orderId?: number; amountLimit?: number; title?: string; direction?: "Receipt" | "Disbursement" }) {
  const [debt, setDebt] = useState(0);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [payments, setPayments] = useState<PaymentDraft[]>([newDraft()]);
  const [checksToAdd, setChecksToAdd] = useState("1");
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer) return;
    const controller = new AbortController();
    setErrors([]);
    Promise.all([customersService.findByPhone(customer.phone, controller.signal), currenciesService.list(controller.signal)])
      .then(([balance, response]) => {
        setDebt(amountLimit ?? (direction === "Receipt" ? Number(balance.customer.amount_due_from_customer) : Number(balance.customer.amount_due_to_customer)));
        const list = Array.isArray(response) ? response : response.items ?? response.currencies ?? [];
        const active = list.filter((item) => item.is_active);
        setCurrencies(active);
        const base = active.find((item) => item.is_base) ?? active[0];
        if (base) setPayments([newDraft(String(base.currency_id))]);
      })
      .catch((error) => { if (!controller.signal.aborted) setErrors(apiMessages(error, "تعذر تجهيز نموذج التحصيل.")); });
    return () => controller.abort();
  }, [amountLimit, customer, direction]);

  const baseTotal = useMemo(() => payments.reduce((total, payment) => {
    const currency = currencies.find((item) => item.currency_id === Number(payment.currencyId));
    const rate = currency?.is_base ? 1 : Number(payment.rate);
    return total + (Number(payment.amount) || 0) * (Number.isFinite(rate) ? rate : 0);
  }, 0), [currencies, payments]);

  if (!customer) return null;
  const update = (index: number, change: Partial<PaymentDraft>) => setPayments((current) => current.map((payment, i) => i === index ? { ...payment, ...change } : payment));
  const addChecks = () => {
    const count = Math.min(60, Math.max(1, Number(checksToAdd) || 1));
    const defaultCurrency = currencies.find((currency) => currency.is_base) ?? currencies[0];
    const source = [...payments].reverse().find((payment) => payment.method === "Check") ?? payments[payments.length - 1] ?? newDraft(defaultCurrency ? String(defaultCurrency.currency_id) : "");
    const numericCheckNumber = /^\d+$/.test(source.checkNumber.trim()) ? Number(source.checkNumber) : null;
    const additions = Array.from({ length: count }, (_, index) => ({
      ...source,
      key: nextKey++,
      method: "Check" as const,
      checkNumber: numericCheckNumber === null ? "" : String(numericCheckNumber + index + 1),
      dueDate: source.dueDate ? addMonths(source.dueDate, index + 1) : "",
    }));
    setPayments((current) => [...current, ...additions]);
    setChecksToAdd("1");
  };

  const requestSubmit = () => {
    const validation: string[] = [];
    if (!payments.length) validation.push("أضف سند قبض واحدًا على الأقل.");
    payments.forEach((payment, index) => {
      const currency = currencies.find((item) => item.currency_id === Number(payment.currencyId));
      const amount = Number(payment.amount);
      const rate = currency?.is_base ? 1 : Number(payment.rate);
      if (!Number.isFinite(amount) || amount <= 0) validation.push(`أدخل مبلغًا صحيحًا للسند ${index + 1}.`);
      if (!currency) validation.push(`اختر عملة السند ${index + 1}.`);
      if (!Number.isFinite(rate) || rate <= 0) validation.push(`أدخل سعر صرف صحيحًا للسند ${index + 1}.`);
      if (payment.method === "Check" && !payment.checkNumber.trim()) validation.push(`رقم الشيك مطلوب للسند ${index + 1}.`);
    });
    if (direction === "Disbursement" && baseTotal > debt + 0.001) validation.push("مجموع سندات الصرف لا يمكن أن يتجاوز الرصيد المستحق للزبون.");
    if (validation.length) return setErrors(validation);
    setErrors([]);
    setConfirming(true);
  };

  const submit = async () => {
    setLoading(true);
    setErrors([]);
    let lastResult: CreatePaymentResponseDto | undefined;
    try {
      for (const payment of payments) {
        const currency = currencies.find((item) => item.currency_id === Number(payment.currencyId))!;
        const create = direction === "Receipt" ? paymentsService.createForCustomer : paymentsService.createDisbursement;
        lastResult = await create(customer.id, {
          amount: Number(payment.amount), currency_id: currency.currency_id,
          exchange_rate: currency.is_base ? 1 : Number(payment.rate), payment_method: payment.method,
          paid_at: payment.paidAt ? new Date(payment.paidAt).toISOString() : undefined,
          notes: payment.notes.trim() || undefined,
          check: payment.method === "Check" ? {
            check_number: payment.checkNumber.trim(), account_number: payment.accountNumber.trim() || undefined,
            bank_number: payment.bankNumber.trim() || undefined, branch_number: payment.branchNumber.trim() || undefined,
            due_date: payment.dueDate || undefined,
          } : undefined,
        });
      }
      if (lastResult) { setConfirming(false); onChanged(lastResult); }
    } catch (error) {
      setErrors(apiMessages(error, `تعذر تسجيل سند ${direction === "Receipt" ? "القبض" : "الصرف"}. قد تكون بعض السندات السابقة حُفظت؛ راجع حساب الزبون قبل إعادة المحاولة.`));
    } finally { setLoading(false); }
  };

  return <Modal open onClose={onClose} title={title ?? (direction === "Receipt" ? "سند قبض من الزبون" : "سند صرف للزبون")} size="wide" mobileFullscreen><div className="space-y-4">
    <div className="rounded-xl bg-stone-50 p-4"><b className="block text-brand">{customer.name}</b><span dir="ltr" className="text-sm text-stone-500">{customer.phone}</span><p className="mt-3 text-lg font-black text-red-700">{direction === "Receipt" ? "المبلغ عليه حاليًا" : "المبلغ المستحق له"}: {formatMoney(debt)}</p></div>
    {errors.length > 0 && <div role="alert" className="rep-error"><ul className="list-inside list-disc">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
    <PaymentDraftTable rows={payments} currencies={currencies} onChange={update} onRemove={(index) => setPayments((current) => current.filter((_, itemIndex) => itemIndex !== index))}/>
    <div className="flex flex-wrap items-center gap-2"><div className="flex items-center overflow-hidden rounded-lg border border-brand/15 bg-white"><input aria-label="عدد الشيكات المراد إضافتها" className="h-10 w-16 border-0 px-2 text-center text-sm font-bold outline-none" type="number" min="1" max="60" value={checksToAdd} onChange={(event)=>setChecksToAdd(event.target.value)}/><button type="button" className="inline-flex h-10 items-center gap-2 bg-brand-50 px-3 text-xs font-black text-brand hover:bg-brand-100" onClick={addChecks}><CopyPlus className="h-4 w-4"/> إضافة شيكات</button></div><span className="text-xs text-stone-500">يمكن إضافة حتى 60 شيكاً دفعة واحدة</span></div>
    <div className="rounded-xl bg-gold/10 p-3 font-black text-brand">الإجمالي بالعملة الأساسية: {formatMoney(baseTotal)}</div>
    <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={onClose}>إلغاء</button><button type="button" disabled={loading || (direction === "Disbursement" && debt <= 0)} className="btn-primary disabled:opacity-50" onClick={requestSubmit}>{direction === "Receipt" ? "إصدار سند القبض" : "إصدار سند الصرف"}</button></div>
    <ConfirmDialog open={confirming} onClose={()=>setConfirming(false)} onConfirm={()=>void submit()} loading={loading} severity="normal" title={direction === "Receipt" ? "تأكيد إصدار سند القبض" : "تأكيد إصدار سند الصرف"} message={direction === "Receipt" && baseTotal > debt + 0.001 ? `المبلغ أكبر من المطلوب بمقدار ${formatMoney(baseTotal-debt)}، وستتحول الزيادة إلى رصيد مستحق للزبون. هل تريد المتابعة؟` : `راجع تفاصيل السندات قبل اعتمادها على حساب ${customer.name}.`} confirmLabel={direction === "Receipt" ? "تأكيد القبض" : "تأكيد الصرف"} details={<div className="grid grid-cols-2 gap-2"><span>عدد السندات: <b>{payments.length}</b></span><span>عدد الشيكات: <b>{payments.filter((payment)=>payment.method==="Check").length}</b></span><span className="col-span-2">الإجمالي: <b className="text-brand">{formatMoney(baseTotal)}</b></span></div>}/>
  </div></Modal>;
}

const two = (value: number) => String(value).padStart(2, "0");
function addMonths(value: string, count: number) { const [year, month, day] = value.split("-").map(Number); const target = new Date(year, month - 1 + count, 1); const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate(); return `${target.getFullYear()}-${two(target.getMonth() + 1)}-${two(Math.min(day, lastDay))}`; }
export function StyledDatePicker({ label, value, includeTime = false, onChange }: { label: string; value: string; includeTime?: boolean; onChange: (value: string) => void }) {
  const parsed = value ? new Date(value) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const selectedDate = value ? new Date(value) : null;
  const hour = selectedDate ? two(selectedDate.getHours()) : "00";
  const minute = selectedDate ? two(Math.floor(selectedDate.getMinutes() / 5) * 5) : "00";
  const setDate = (day: number) => {
    const current = selectedDate ?? new Date();
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, current.getHours(), current.getMinutes());
    const date = `${next.getFullYear()}-${two(next.getMonth() + 1)}-${two(next.getDate())}`;
    onChange(`${date}${includeTime ? `T${two(next.getHours())}:${two(next.getMinutes())}` : ""}`);
    if (!includeTime) setOpen(false);
  };
  const setTime = (nextHour: string, nextMinute: string) => {
    const current = selectedDate ?? new Date();
    const date = `${current.getFullYear()}-${two(current.getMonth() + 1)}-${two(current.getDate())}`;
    onChange(`${date}T${nextHour}:${nextMinute}`);
  };
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const days = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const display = selectedDate ? new Intl.DateTimeFormat("ar", { dateStyle: "medium", ...(includeTime ? { timeStyle: "short" as const } : {}) }).format(selectedDate) : "اختر التاريخ";
  return <div ref={root} className="relative"><span className="rep-label">{label}</span><button type="button" className="rep-control flex min-h-11 w-full items-center justify-between text-right" onClick={() => setOpen((current) => !current)}><span className="truncate text-sm">{display}</span><CalendarDays className="h-4 w-4 shrink-0 text-brand"/></button>
    {open && <div className="absolute right-0 top-full z-50 mt-2 w-[290px] max-w-[calc(100vw-2rem)] rounded-xl border border-brand/20 bg-white p-3 shadow-2xl">
      <div className="flex items-center justify-between"><button type="button" className="rounded-lg p-1.5 hover:bg-stone-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4"/></button><strong className="text-sm">{new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(visibleMonth)}</strong><button type="button" className="rounded-lg p-1.5 hover:bg-stone-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4"/></button></div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold text-stone-500">{["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((name) => <span key={name} className="py-1">{name}</span>)}</div>
      <div className="grid grid-cols-7 gap-0.5">{Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`}/>)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const selected = selectedDate?.getFullYear() === visibleMonth.getFullYear() && selectedDate?.getMonth() === visibleMonth.getMonth() && selectedDate?.getDate() === day; return <button key={day} type="button" onClick={() => setDate(day)} className={`grid h-8 place-items-center rounded-md text-xs font-bold transition ${selected ? "bg-brand text-white" : "hover:bg-brand-50"}`}>{day}</button>; })}</div>
      {includeTime && <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3"><Select label="الساعة" value={hour} onChange={(next) => setTime(next, minute)} options={Array.from({ length: 24 }, (_, index) => ({ value: two(index), label: two(index) }))}/><Select label="الدقيقة" value={minute} onChange={(next) => setTime(hour, next)} options={Array.from({ length: 12 }, (_, index) => ({ value: two(index * 5), label: two(index * 5) }))}/><button type="button" className="btn-primary col-span-2 py-2" onClick={() => setOpen(false)}>تم</button></div>}
    </div>}
  </div>;
}
