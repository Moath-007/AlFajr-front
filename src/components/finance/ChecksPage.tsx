import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Search } from "lucide-react";
import { checksService, paymentsService, type CheckListItemDto, type ChecksQuery, type PaymentCheckDto, type TreasuryBalanceDto, type TreasuryOpeningBalanceDto } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { StyledDatePicker } from "@/components/ui/CustomerSettlementModal";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/utils/money";
import PaymentDetailsModal from "./PaymentDetailsModal";
import Modal from "@/components/ui/Modal";

const statusLabel: Record<PaymentCheckDto["status"], string> = {
  Pending: "قيد الانتظار",
  Collected: "محصّل",
  Returned: "راجع",
};

const statusStyle: Record<PaymentCheckDto["status"], string> = {
  Pending: "border-amber-200 bg-amber-50 text-amber-800",
  Collected: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Returned: "border-red-200 bg-red-50 text-red-700",
};

export default function ChecksPage() {
  const [items, setItems] = useState<CheckListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | PaymentCheckDto["status"]>("");
  const [due, setDue] = useState<"" | "overdue" | "upcoming">("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [action, setAction] = useState<{ item: CheckListItemDto; kind: "collect" | "return" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<number | null>(null);
  const [treasury, setTreasury] = useState<TreasuryBalanceDto | null>(null);
  const [openingRows, setOpeningRows] = useState<TreasuryOpeningBalanceDto[]>([]);
  const [openingEditor, setOpeningEditor] = useState<TreasuryOpeningBalanceDto | "new" | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const query: ChecksQuery = {
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        due: due || undefined,
        due_from: due ? undefined : dueFrom || undefined,
        due_to: due ? undefined : dueTo || undefined,
      };
      const [response, treasuryBalance, treasuryOpenings] = await Promise.all([checksService.list(query, signal), paymentsService.treasuryBalance(signal), paymentsService.treasuryOpeningBalances(signal)]);
      setItems(response.items);
      setPages(response.pagination.total_pages || 1);
      setTreasury(treasuryBalance);
      setOpeningRows(treasuryOpenings);
    } catch (reason) {
      if (!signal?.aborted) setError(apiMessages(reason, "تعذر تحميل الشيكات.").join("، "));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [due, dueFrom, dueTo, page, search, status]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (dueFrom && dueTo && dueFrom > dueTo) return setError("تاريخ البداية يجب أن يسبق تاريخ النهاية.");
    setPage(1);
    setSearch(searchText.trim());
  };

  const clear = () => {
    setSearchText("");
    setSearch("");
    setStatus("");
    setDue("");
    setDueFrom("");
    setDueTo("");
    setPage(1);
  };

  const execute = async () => {
    if (!action) return;
    setSaving(true);
    try {
      if (action.kind === "collect") await paymentsService.collectCheck(action.item.payment_id);
      else await paymentsService.returnCheck(action.item.payment_id);
      setAction(null);
      await load();
    } catch (reason) {
      setError(apiMessages(reason, "تعذر تحديث حالة الشيك.").join("، "));
      setAction(null);
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6" dir="rtl">
    <header className="border-b pb-5">
      <p className="text-xs font-black text-gold-dark">الخزينة والحركات المؤجلة</p>
      <h1 className="mt-1 text-3xl font-black text-brand">الخزينة والشيكات</h1>
    </header>
    {treasury && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[["الرصيد الفعلي",treasury.balance],["صافي النقد",treasury.cash_net],["الشيكات المحصلة",treasury.collected_checks_net],["الواردة المعلقة",treasury.pending_incoming_checks],["الصادرة المعلقة",treasury.pending_outgoing_checks]].map(([label,value]) => <div key={label} className="rounded-xl border bg-white p-4"><small className="font-bold text-stone-500">{label}</small><b className="mt-1 block text-xl text-brand">{formatMoney(value)}</b></div>)}</section>}
    <section className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-brand">الأرصدة الافتتاحية للخزينة</h2><p className="text-xs text-stone-500">للإدارة فقط، والإلغاء يعكس الأثر دون حذف السجل.</p></div><button className="btn-outline" onClick={() => setOpeningEditor("new")}>إضافة رصيد افتتاحي</button></div>{openingRows.length > 0 && <div className="mt-3 space-y-2">{openingRows.map((row) => <div key={row.treasury_entry_id} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3"><div><b>{formatMoney(row.amount)}</b><p className="text-xs text-stone-500">{new Date(row.effective_at).toLocaleDateString("ar-EG")} · {row.cancelled_at ? "ملغى" : "فعال"}</p></div>{!row.cancelled_at && <div className="flex gap-2"><button className="btn-outline" onClick={() => setOpeningEditor(row)}>تعديل</button><button className="btn-outline text-red-700" onClick={async () => { try { await paymentsService.cancelTreasuryOpeningBalance(row.treasury_entry_id); await load(); } catch (reason) { setError(apiMessages(reason, "تعذر إلغاء الرصيد الافتتاحي.").join("، ")); } }}>إلغاء</button></div>}</div>)}</div>}</section>

    <form onSubmit={submit} className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
      <label>
        <span className="rep-label">رقم الشيك</span>
        <span className="relative block">
          <Search className="absolute right-3 top-3 h-4 w-4"/>
          <input className="rep-control pr-9" value={searchText} onChange={(event) => setSearchText(event.target.value)}/>
        </span>
      </label>
      <Select label="الحالة" value={status} onChange={(value) => { setStatus(value as typeof status); setPage(1); }} options={[{ value: "", label: "كل الحالات" }, { value: "Pending", label: "قيد الانتظار" }, { value: "Collected", label: "محصّل" }, { value: "Returned", label: "راجع" }]}/>
      <Select label="الاستحقاق" value={due} onChange={(value) => { setDue(value as typeof due); setPage(1); }} options={[{ value: "", label: "فترة مخصصة" }, { value: "overdue", label: "متأخر" }, { value: "upcoming", label: "قادم" }]}/>
      <div className={due ? "pointer-events-none opacity-50" : ""}><StyledDatePicker label="من تاريخ" value={dueFrom} onChange={setDueFrom}/></div>
      <div className={due ? "pointer-events-none opacity-50" : ""}><StyledDatePicker label="إلى تاريخ" value={dueTo} onChange={setDueTo}/></div>
      <button className="btn-primary">بحث</button>
      {(search || status || due || dueFrom || dueTo) && <button type="button" onClick={clear} className="text-sm font-bold text-gold-dark xl:col-span-6 xl:justify-self-start">مسح الفلاتر</button>}
    </form>

    {error && <div className="rep-error flex justify-between">{error}<button onClick={() => void load()}><RefreshCw className="h-4 w-4"/></button></div>}
    {loading ? <Skeleton className="h-80"/> : items.length === 0 ? <EmptyState title="لا توجد شيكات مطابقة"/> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <article key={`${item.payment_id}-${item.check_number}`} className="flex min-h-52 flex-col rounded-xl border bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <b className="block truncate text-base text-brand">شيك #{item.check_number}</b>
              <p className="mt-0.5 truncate text-xs text-stone-500">{item.payment?.customer?.name ?? "—"}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${statusStyle[item.status]}`}>{statusLabel[item.status]}</span>
          </div>
          <div className="mt-3 space-y-1.5 border-y py-2.5 text-sm">
            <p><span className="text-stone-500">الاستحقاق: </span><b>{item.due_date ? new Date(item.due_date).toLocaleDateString("ar-EG-u-nu-latn") : "غير محدد"}</b></p>
            <p><span className="text-stone-500">المبلغ: </span><b>{formatMoney(item.payment?.amount, item.payment?.currency)}</b></p>
            <p className="truncate text-xs text-stone-500">سجلها: {item.payment?.recorded_by?.name ?? "النظام"}</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setDetails(item.payment_id)}>التفاصيل</button>
            {item.status === "Pending" && <>
              <button onClick={() => setAction({ item, kind: "collect" })} className="btn-primary px-3 py-1.5 text-xs">تحصيل</button>
              <button onClick={() => setAction({ item, kind: "return" })} className="btn-outline px-3 py-1.5 text-xs text-red-700">إرجاع</button>
            </>}
          </div>
        </article>)}
      </div>}

    {pages > 1 && <div className="flex justify-center gap-3"><button className="btn-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>السابق</button><span className="py-2">{page} / {pages}</span><button className="btn-outline" disabled={page === pages} onClick={() => setPage(page + 1)}>التالي</button></div>}
    <PaymentDetailsModal paymentId={details} onClose={() => setDetails(null)}/>
    <TreasuryOpeningEditor item={openingEditor} onClose={() => setOpeningEditor(null)} onSaved={async () => { setOpeningEditor(null); await load(); }}/>
    <ConfirmDialog open={action !== null} onClose={() => setAction(null)} onConfirm={() => void execute()} loading={saving} severity={action?.kind === "return" ? "destructive" : "normal"} title={action?.kind === "return" ? "إرجاع الشيك" : "تحصيل الشيك"} message={action?.kind === "return" ? "ستصبح الدفعة غير فعالة وتعود المديونية المرتبطة بها، دون إلغاء الطلب أو مشتريات الزبون ودون تغيير المخزون." : "هل تريد تأكيد تحصيل هذا الشيك؟"} confirmLabel={action?.kind === "return" ? "تأكيد الإرجاع" : "تأكيد التحصيل"}/>
  </div>;
}

function TreasuryOpeningEditor({ item, onClose, onSaved }: { item: TreasuryOpeningBalanceDto | "new" | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const current = item && item !== "new" ? item : null;
  const [amount, setAmount] = useState(""), [date, setDate] = useState(""), [notes, setNotes] = useState(""), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  useEffect(() => { const value = item && item !== "new" ? item : null; setAmount(value?.amount ?? ""); setDate(value?.effective_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)); setNotes(value?.notes ?? ""); setError(""); }, [item]);
  if (!item) return null;
  const save = async () => { if (Number(amount) <= 0) return setError("أدخل مبلغًا صحيحًا."); setSaving(true); try { const data = { amount: Number(amount), effective_at: `${date}T00:00:00`, notes: notes.trim() || undefined }; if (current) await paymentsService.updateTreasuryOpeningBalance(current.treasury_entry_id, data); else await paymentsService.createTreasuryOpeningBalance(data); await onSaved(); } catch (reason) { setError(apiMessages(reason, "تعذر حفظ الرصيد الافتتاحي.").join("، ")); } finally { setSaving(false); } };
  return <Modal open onClose={onClose} title={current ? "تعديل رصيد الخزينة الافتتاحي" : "إضافة رصيد الخزينة الافتتاحي"}><div className="space-y-3">{error && <div className="rep-error">{error}</div>}<input className="rep-control" type="number" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ"/><StyledDatePicker label="التاريخ الفعلي" value={date} onChange={setDate}/><textarea className="rep-control" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات"/><button className="btn-primary w-full" disabled={saving} onClick={() => void save()}>{saving ? "جاري الحفظ…" : "حفظ"}</button></div></Modal>;
}
