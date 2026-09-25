import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  customersService,
  paymentsService,
  returnsService,
  writeOffsService,
  type CustomerAccountDto,
  type CustomerDebtDto,
  type CustomerOpeningBalanceDto,
  type CustomerReturnDto,
  type PaymentDto,
  type StatementEntryDto,
  type WriteOffDto,
} from "@/api";
import { apiMessages, formatOrderDate } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CustomerSettlementModal, {
  StyledDatePicker,
} from "@/components/ui/CustomerSettlementModal";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import WriteOffModal from "@/components/ui/WriteOffModal";
import EditPaymentModal from "@/components/finance/EditPaymentModal";
import PaymentDetailsModal from "@/components/finance/PaymentDetailsModal";
import { Skeleton } from "@/components/ui/Skeleton";
import Select from "@/components/ui/Select";
import CustomerReturnLauncher from "@/components/customers/CustomerReturnLauncher";
import { formatMoney } from "@/utils/money";
import { useAuth } from "@/auth";

type Tab = "statement" | "payments" | "opening" | "returns" | "writeoffs";
type Action = {
  kind: "payment" | "opening" | "return" | "writeoff";
  id: number;
  label: string;
} | null;
const PAGE_SIZE = 10;
const paginate = <T,>(items: T[], page: number) =>
  items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
export default function CustomerProfilePage({
  customerId,
}: {
  customerId: number;
}) {
  const { user } = useAuth(),
    isAdmin = user?.role === "Admin";
  const navigate = useNavigate(),
    [customer, setCustomer] = useState<CustomerAccountDto | null>(null),
    [payments, setPayments] = useState<PaymentDto[]>([]),
    [entries, setEntries] = useState<StatementEntryDto[]>([]),
    [opening, setOpening] = useState<CustomerOpeningBalanceDto[]>([]),
    [returns, setReturns] = useState<CustomerReturnDto[]>([]),
    [writeOffs, setWriteOffs] = useState<WriteOffDto[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState<Tab>("statement"),
    [page, setPage] = useState(1),
    [movement, setMovement] = useState<"Receipt" | "Disbursement" | null>(null),
    [returnCreation, setReturnCreation] = useState<
      "SalesReturn" | "PurchaseReturn" | null
    >(null),
    [openingModal, setOpeningModal] = useState<
      CustomerOpeningBalanceDto | "new" | null
    >(null),
    [writeOffModal, setWriteOffModal] = useState(false),
    [details, setDetails] = useState<number | null>(null),
    [returnDetails, setReturnDetails] = useState<CustomerReturnDto | null>(
      null,
    ),
    [editPayment, setEditPayment] = useState<number | null>(null),
    [action, setAction] = useState<Action>(null),
    [saving, setSaving] = useState(false);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      customersService.accounts({ page: 1, limit: 100 }, c.signal),
      paymentsService.listForCustomer(customerId, 1, 100, c.signal),
      customersService.statement(customerId, {}, c.signal),
      isAdmin
        ? customersService.listOpeningBalances(customerId, c.signal)
        : Promise.resolve([]),
      returnsService.list({ customer_id: customerId }, c.signal),
      writeOffsService.list(customerId, 1, 100, c.signal),
    ])
      .then(([a, p, s, o, r, w]) => {
        const found = a.items.find((x) => Number(x.customer_id) === customerId);
        if (!found) throw new Error("حساب الزبون غير موجود");
        setCustomer(found);
        setPayments(p.items);
        setEntries(s.entries);
        setOpening(o);
        setReturns(r);
        setWriteOffs(w.items);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل حساب الزبون.").join("، "));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [customerId, isAdmin, revision]);
  const pendingChecks = Number(customer?.pending_checks_amount ?? 0),
    dueFrom = Number(customer?.amount_due_from_customer ?? 0),
    dueTo = Number(customer?.amount_due_to_customer ?? 0);
  const tabTotal =
    tab === "statement"
      ? entries.length
      : tab === "payments"
        ? payments.length
        : tab === "opening"
          ? opening.length
          : tab === "returns"
            ? returns.length
            : writeOffs.length;
  const totalPages = Math.max(1, Math.ceil(tabTotal / PAGE_SIZE));
  useEffect(
    () => setPage((current) => Math.min(current, totalPages)),
    [totalPages],
  );
  const cancel = async () => {
    if (!action) return;
    setSaving(true);
    try {
      if (action.kind === "payment") await paymentsService.cancel(action.id);
      else if (action.kind === "opening")
        await customersService.cancelOpeningBalance(action.id);
      else if (action.kind === "return") await returnsService.cancel(action.id);
      else await writeOffsService.cancel(action.id);
      setAction(null);
      refresh();
    } catch (e) {
      setError(apiMessages(e, "تعذر إلغاء السجل.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  if (loading && !customer) return <Skeleton className="h-[520px]" />;
  const customerForModal =
    movement && customer
      ? { id: customerId, name: customer.name, phone: customer.phone }
      : null;
  return (
    <div className="space-y-6" dir="rtl">
      <button
        className="btn-outline inline-flex items-center gap-2"
        onClick={() => navigate(-1)}
      >
        <ArrowRight className="h-4 w-4" />
        رجوع
      </button>
      <header className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-gold-dark">
              الحساب المالي الموحّد
            </p>
            <h1 className="text-3xl font-black text-brand">
              {customer?.name ?? `زبون #${customerId}`}
            </h1>
            <p className="text-sm text-stone-500">{customer?.phone}</p>
          </div>
          <button
            type="button"
            disabled={loading}
            title="تحديث بيانات الحساب"
            aria-label="تحديث بيانات الحساب"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-brand/20 bg-white px-3 text-sm font-black text-brand shadow-sm transition hover:border-brand/40 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
            onClick={refresh}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card label="المطلوب من الزبون" value={dueFrom} tone="red" />
          <Card label="المستحق للزبون" value={dueTo} tone="green" />
          <Card label="الشيكات المعلقة" value={pendingChecks} tone="amber" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            onClick={() => setMovement("Receipt")}
          >
            قبض من الزبون
          </button>
          <button
            className="btn-outline disabled:opacity-50"
            disabled={dueTo <= 0}
            title={dueTo <= 0 ? "لا يوجد رصيد مستحق للزبون" : undefined}
            onClick={() => setMovement("Disbursement")}
          >
            دفع للزبون
          </button>
          <button
            className="btn-outline"
            onClick={() => setReturnCreation("SalesReturn")}
          >
            مردود مبيعات
          </button>
          <button
            className="btn-outline"
            onClick={() => setReturnCreation("PurchaseReturn")}
          >
            مردود مشتريات
          </button>
          <button
            className="btn-outline"
            onClick={() => setOpeningModal("new")}
          >
            إضافة رصيد أو دين افتتاحي
          </button>
          <button
            className="btn-outline disabled:opacity-50"
            disabled={dueFrom <= 0}
            onClick={() => setWriteOffModal(true)}
          >
            إضافة مسامحة
          </button>
        </div>
      </header>
      {error && <div className="rep-error">{error}</div>}
      <nav className="flex gap-2 overflow-x-auto">
        {(
          [
            ["statement", "كشف الحساب"],
            ["payments", "القبض والدفع"],
            ["opening", "الأرصدة والديون الافتتاحية"],
            ["returns", "المردودات"],
            ["writeoffs", "المسامحات"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={
              tab === key
                ? "btn-primary whitespace-nowrap"
                : "btn-outline whitespace-nowrap"
            }
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <section className="rounded-2xl border bg-white p-4">
        {tab === "statement" ? (
          <Statement items={paginate(entries, page)} />
        ) : tab === "payments" ? (
          <List
            items={paginate(payments, page)}
            empty="لا توجد حركات"
            render={(payment) => (
              <Row
                key={payment.id}
                title={`${payment.payment_type === "Receipt" ? "قبض من الزبون" : "دفع للزبون"} · ${formatMoney(payment.base_amount)}`}
                meta={`${formatOrderDate(payment.paid_at)} · ${payment.payment_method === "Cash" ? "نقد" : `شيك ${payment.check?.check_number ?? ""}`} · ${payment.effective_state === "Cancelled" ? "ملغاة" : payment.effective_state === "Returned" ? "راجعة" : "فعالة"}`}
                actions={
                  <>
                    <button
                      className="btn-outline"
                      onClick={() => setDetails(payment.id)}
                    >
                      التفاصيل
                    </button>
                    {payment.effective_state === "Effective" && (
                      <>
                        <button
                          className="btn-outline"
                          onClick={() => setEditPayment(payment.id)}
                        >
                          تعديل
                        </button>
                        <button
                          className="btn-outline text-red-700"
                          onClick={() =>
                            setAction({
                              kind: "payment",
                              id: payment.id,
                              label: "حركة الحساب",
                            })
                          }
                        >
                          إلغاء
                        </button>
                      </>
                    )}
                  </>
                }
              />
            )}
          />
        ) : tab === "opening" ? (
          <List
            items={paginate(opening, page)}
            empty="لا توجد أرصدة أو ديون افتتاحية"
            render={(item) => (
              <Row
                key={item.customer_account_adjustment_id}
                title={`${item.direction === "Debit" ? "دين افتتاحي على الزبون" : "رصيد افتتاحي لصالح الزبون"} · ${formatMoney(item.amount)}`}
                meta={`${formatOrderDate(item.effective_at)} · ${item.cancelled_at ? "ملغى" : "فعال"}`}
                actions={
                  !item.cancelled_at && (
                    <>
                      <button
                        className="btn-outline"
                        onClick={() => setOpeningModal(item)}
                      >
                        تعديل
                      </button>
                      <button
                        className="btn-outline text-red-700"
                        onClick={() =>
                          setAction({
                            kind: "opening",
                            id: item.customer_account_adjustment_id,
                            label: "الرصيد أو الدين الافتتاحي",
                          })
                        }
                      >
                        إلغاء
                      </button>
                    </>
                  )
                }
              />
            )}
          />
        ) : tab === "returns" ? (
          <List
            items={paginate(returns, page)}
            empty="لا توجد مردودات"
            render={(item) => (
              <Row
                key={item.customer_return_id}
                title={`${item.type === "SalesReturn" ? "مردود مبيعات" : "مردود مشتريات"} #${item.customer_return_id} · ${formatMoney(item.total_amount)}`}
                meta={`${formatOrderDate(item.created_at)} · ${item.items.length} صنف · ${item.cancelled_at ? "ملغى" : "فعال"}`}
                actions={
                  <>
                    <button
                      className="btn-outline"
                      onClick={() => setReturnDetails(item)}
                    >
                      التفاصيل
                    </button>
                    {!item.cancelled_at && (
                      <button
                        className="btn-outline text-red-700"
                        onClick={() =>
                          setAction({
                            kind: "return",
                            id: item.customer_return_id,
                            label: "المردود",
                          })
                        }
                      >
                        إلغاء
                      </button>
                    )}
                  </>
                }
              />
            )}
          />
        ) : (
          <>
            <Hint>المسامحة على حساب الزبون فقط، دون تخصيص لطلب أو دين.</Hint>
            <List
              items={paginate(writeOffs, page)}
              empty="لا توجد مسامحات"
              render={(item) => (
                <Row
                  key={item.write_off_id}
                  title={`مسامحة #${item.write_off_id} · ${formatMoney(item.amount)}`}
                  meta={`${formatOrderDate(item.created_at)} · ${item.is_cancelled ? "ملغاة" : "فعالة"}`}
                  actions={
                    !item.is_cancelled && (
                      <button
                        className="btn-outline text-red-700"
                        onClick={() =>
                          setAction({
                            kind: "writeoff",
                            id: item.write_off_id,
                            label: "المسامحة",
                          })
                        }
                      >
                        إلغاء
                      </button>
                    )
                  }
                />
              )}
            />
          </>
        )}
        <Pagination page={page} totalItems={tabTotal} onChange={setPage} />
      </section>
      <CustomerSettlementModal
        customer={customerForModal}
        direction={movement ?? "Receipt"}
        onClose={() => setMovement(null)}
        onChanged={() => {
          setMovement(null);
          refresh();
        }}
      />
      <CustomerReturnLauncher
        customerId={customerId}
        type={returnCreation}
        onClose={() => setReturnCreation(null)}
        onSaved={() => {
          setReturnCreation(null);
          setTab("returns");
          setPage(1);
          refresh();
        }}
      />
      <OpeningEditor
        item={openingModal}
        customerId={customerId}
        onClose={() => setOpeningModal(null)}
        onSaved={() => {
          setOpeningModal(null);
          refresh();
        }}
      />
      <WriteOffModal
        customerId={writeOffModal ? customerId : null}
        maxAmount={dueFrom}
        onClose={() => setWriteOffModal(false)}
        onSaved={() => {
          setWriteOffModal(false);
          refresh();
        }}
      />
      <PaymentDetailsModal
        paymentId={details}
        onClose={() => setDetails(null)}
      />
      <ReturnDetailsModal
        item={returnDetails}
        onClose={() => setReturnDetails(null)}
      />
      <EditPaymentModal
        paymentId={editPayment}
        onClose={() => setEditPayment(null)}
        onSaved={() => {
          setEditPayment(null);
          refresh();
        }}
      />
      <ConfirmDialog
        open={action !== null}
        onClose={() => setAction(null)}
        onConfirm={() => void cancel()}
        loading={saving}
        severity="destructive"
        title={`إلغاء ${action?.label ?? "السجل"}`}
        message="سيبقى السجل ظاهرًا بعلامة ملغى، وسيُعكس أثره المالي فورًا."
        confirmLabel="تأكيد الإلغاء"
      />
    </div>
  );
  /* Legacy single-line layout kept out of compilation while the page is migrated to the readable layout above.
  return <div className="space-y-6" dir="rtl"><button className="btn-outline inline-flex items-center gap-2" onClick={()=>navigate(-1)}><ArrowRight className="h-4 w-4"/>رجوع</button><header className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-black text-gold-dark">الحساب المالي الموحّد</p><h1 className="text-3xl font-black text-brand">{customer?.name??`زبون #${customerId}`}</h1><p className="text-sm text-stone-500">{customer?.phone}</p></div><button className="btn-outline inline-flex gap-2" onClick={refresh}><RefreshCw className="h-4 w-4"/>تحديث</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Card label="المطلوب من الزبون" value={dueFrom} tone="red"/><Card label="المستحق للزبون" value={dueTo} tone="green"/><Card label="الشيكات المعلقة" value={pendingChecks} tone="amber"/></div><div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary" onClick={()=>setMovement("Receipt")}>قبض من الزبون</button><button className="btn-outline disabled:opacity-50" disabled={dueTo<=0} title={dueTo<=0?"لا يوجد رصيد مستحق للزبون":undefined} onClick={()=>setMovement("Disbursement")}>دفع للزبون</button><button className="btn-outline" onClick={()=>setOpeningModal("new")}>إضافة رصيد أو دين افتتاحي</button><button className="btn-outline disabled:opacity-50" disabled={dueFrom<=0} onClick={()=>setWriteOffModal(true)}>إضافة مسامحة</button></div></header>{error&&<div className="rep-error">{error}</div>}<nav className="flex gap-2 overflow-x-auto">{([ ["statement","كشف الحساب"],["payments","القبض والدفع"],["debts","الديون اليدوية السابقة"],["opening","الأرصدة والديون الافتتاحية"],["returns","المردودات"],["writeoffs","المسامحات"] ] as [Tab,string][]).map(([k,l])=><button key={k} className={tab===k?"btn-primary whitespace-nowrap":"btn-outline whitespace-nowrap"} onClick={()=>{setTab(k);setPage(1)}}>{l}</button>)}</nav><section className="rounded-2xl border bg-white p-4">{tab==="statement"?<Statement items={paginate(entries,page)}/>:tab==="payments"?<List items={paginate(payments,page)} empty="لا توجد حركات" render={p=><Row key={p.id} title={`${p.payment_type==="Receipt"?"قبض من الزبون":"دفع للزبون"} · ${formatMoney(p.base_amount)}`} meta={`${formatOrderDate(p.paid_at)} · ${p.payment_method==="Cash"?"نقد":`شيك ${p.check?.check_number??""}`} · ${p.effective_state==="Cancelled"?"ملغاة":p.effective_state==="Returned"?"راجعة":"فعالة"}`} actions={<><button className="btn-outline" onClick={()=>setDetails(p.id)}>التفاصيل</button>{p.effective_state==="Effective"&&<><button className="btn-outline" onClick={()=>setEditPayment(p.id)}>تعديل</button><button className="btn-outline text-red-700" onClick={()=>setAction({kind:"payment",id:p.id,label:"حركة الحساب"})}>إلغاء</button></>}</>}/>}/>:tab==="debts"?<><Hint>هذه سجلات الديون اليدوية السابقة، وتبقى متاحة للمراجعة والتعديل.</Hint><List items={paginate(debts,page)} empty="لا توجد ديون يدوية سابقة" render={d=><Row key={d.id} title={`${d.reason} · ${formatMoney(d.amount)}`} meta={`${formatOrderDate(d.debt_date)} · ${d.cancelled_at?"ملغى":"فعال"}`} actions={!d.cancelled_at&&<><button className="btn-outline" onClick={()=>setDebtModal(d)}>تعديل</button><button className="btn-outline text-red-700" onClick={()=>setAction({kind:"debt",id:d.id,label:"الدين اليدوي"})}>إلغاء</button></>}/>}/></>:tab==="opening"?<List items={paginate(opening,page)} empty="لا توجد أرصدة أو ديون افتتاحية" render={o=><Row key={o.customer_account_adjustment_id} title={`${o.direction==="Debit"?"دين افتتاحي على الزبون":"رصيد افتتاحي لصالح الزبون"} · ${formatMoney(o.amount)}`} meta={`${formatOrderDate(o.effective_at)} · ${o.cancelled_at?"ملغى":"فعال"}`} actions={!o.cancelled_at&&<><button className="btn-outline" onClick={()=>setOpeningModal(o)}>تعديل</button><button className="btn-outline text-red-700" onClick={()=>setAction({kind:"opening",id:o.customer_account_adjustment_id,label:"الرصيد أو الدين الافتتاحي"})}>إلغاء</button></>}/>}/>:tab==="returns"?<List items={paginate(returns,page)} empty="لا توجد مردودات" render={r=><Row key={r.customer_return_id} title={`${r.type==="SalesReturn"?"مردود مبيعات":"مردود مشتريات"} #${r.customer_return_id} · ${formatMoney(r.total_amount)}`} meta={`${formatOrderDate(r.created_at)} · ${r.items.length} صنف · ${r.cancelled_at?"ملغى":"فعال"}`} actions={!r.cancelled_at&&<button className="btn-outline text-red-700" onClick={()=>setAction({kind:"return",id:r.customer_return_id,label:"المردود"})}>إلغاء</button>}/>}/>:<><Hint>المسامحة على حساب الزبون فقط، دون تخصيص لطلب أو دين.</Hint><List items={paginate(writeOffs,page)} empty="لا توجد مسامحات" render={w=><Row key={w.write_off_id} title={`مسامحة #${w.write_off_id} · ${formatMoney(w.amount)}`} meta={`${formatOrderDate(w.created_at)} · ${w.is_cancelled?"ملغاة":"فعالة"}`} actions={!w.is_cancelled&&<button className="btn-outline text-red-700" onClick={()=>setAction({kind:"writeoff",id:w.write_off_id,label:"المسامحة"})}>إلغاء</button>}/>}/></>}<Pagination page={page} totalItems={tabTotal} onChange={setPage}/></section><CustomerSettlementModal customer={customerForModal} direction={movement??"Receipt"} onClose={()=>setMovement(null)} onChanged={()=>{setMovement(null);refresh();}}/><DebtEditor item={debtModal} customerId={customerId} onClose={()=>setDebtModal(null)} onSaved={()=>{setDebtModal(null);refresh();}}/><OpeningEditor item={openingModal} customerId={customerId} onClose={()=>setOpeningModal(null)} onSaved={()=>{setOpeningModal(null);refresh();}}/><WriteOffModal customerId={writeOffModal?customerId:null} maxAmount={dueFrom} onClose={()=>setWriteOffModal(false)} onSaved={()=>{setWriteOffModal(false);refresh();}}/><PaymentDetailsModal paymentId={details} onClose={()=>setDetails(null)}/><EditPaymentModal paymentId={editPayment} onClose={()=>setEditPayment(null)} onSaved={()=>{setEditPayment(null);refresh();}}/><ConfirmDialog open={action!==null} onClose={()=>setAction(null)} onConfirm={()=>void cancel()} loading={saving} severity="destructive" title={`إلغاء ${action?.label??"السجل"}`} message="سيبقى السجل ظاهرًا بعلامة ملغى، وسيُعكس أثره المالي فورًا." confirmLabel="تأكيد الإلغاء"/></div>;
}
  */
}
function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "green" | "amber" | "neutral";
}) {
  const c = {
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    neutral: "border-stone-200 bg-stone-50 text-stone-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${c[tone]}`}>
      <small className="font-bold">{label}</small>
      <b className="mt-1 block text-xl">{formatMoney(value)}</b>
    </div>
  );
}
function Pagination({
  page,
  totalItems,
  onChange,
}: {
  page: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.ceil(totalItems / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <nav
      className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t pt-4"
      aria-label="صفحات السجلات"
    >
      <button
        className="btn-outline inline-flex items-center gap-1"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronRight className="h-4 w-4" />
        السابق
      </button>
      <span className="rounded-lg bg-stone-50 px-4 py-2 text-sm font-bold text-stone-600">
        صفحة {page} من {pages} · {totalItems} سجل
      </span>
      <button
        className="btn-outline inline-flex items-center gap-1"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        التالي
        <ChevronLeft className="h-4 w-4" />
      </button>
    </nav>
  );
}
function List<T>({
  items,
  empty,
  render,
}: {
  items: T[];
  empty: string;
  render: (x: T) => ReactNode;
}) {
  return items.length ? (
    <div className="space-y-2">{items.map(render)}</div>
  ) : (
    <EmptyState title={empty} />
  );
}
function Row({
  title,
  meta,
  actions,
}: {
  title: string;
  meta: string;
  actions?: ReactNode;
}) {
  return (
    <article className="flex flex-wrap justify-between gap-3 rounded-xl border p-3">
      <div>
        <b className="text-brand">{title}</b>
        <p className="mt-1 text-xs text-stone-500">{meta}</p>
      </div>
      <div className="flex gap-2">{actions}</div>
    </article>
  );
}
function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
      {children}
    </p>
  );
}
function Statement({ items }: { items: StatementEntryDto[] }) {
  if (!items.length) return <EmptyState title="لا توجد حركات" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-stone-50">
          <tr>
            {[
              "التاريخ",
              "الحركة",
              "مدين",
              "دائن",
              "الرصيد",
              "المستخدم",
              "الطريقة",
            ].map((x) => (
              <th className="p-3 text-right" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((e, i) => (
            <tr key={`${e.type}-${e.date}-${i}`}>
              <td className="p-3">{formatOrderDate(e.date)}</td>
              <td className="p-3">
                <b>{labels[e.type]}</b>
                <small className="block text-stone-500">{e.description}</small>
              </td>
              <td className="p-3">{formatMoney(e.debit)}</td>
              <td className="p-3">{formatMoney(e.credit)}</td>
              <td className="p-3 font-black">{formatMoney(e.balance)}</td>
              <td className="p-3">{e.actor?.name ?? "النظام"}</td>
              <td className="p-3">
                {e.payment_method === "Cash"
                  ? "نقد"
                  : e.payment_method === "Check"
                    ? `شيك ${e.check_number ?? ""}`
                    : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ReturnDetailsModal({
  item,
  onClose,
}: {
  item: CustomerReturnDto | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`تفاصيل المردود #${item.customer_return_id}`}
      size="lg"
    >
      <div className="space-y-4" dir="rtl">
        <div className="grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
          <p>
            النوع:{" "}
            <b>
              {item.type === "SalesReturn" ? "مردود مبيعات" : "مردود مشتريات"}
            </b>
          </p>
          <p>
            الحالة:{" "}
            <b
              className={
                item.cancelled_at ? "text-red-700" : "text-emerald-700"
              }
            >
              {item.cancelled_at ? "ملغى" : "فعال"}
            </b>
          </p>
          <p>
            التاريخ: <b>{formatOrderDate(item.created_at)}</b>
          </p>
          <p>
            المرجع:{" "}
            <b>
              {item.order_id
                ? `طلب #${item.order_id}`
                : item.customer_purchase_id
                  ? `شراء #${item.customer_purchase_id}`
                  : "—"}
            </b>
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-stone-50">
              <tr>
                {["الصنف", "المقاس", "الكمية", "سعر الوحدة", "الإجمالي"].map(
                  (label) => (
                    <th key={label} className="p-3 text-right">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {item.items.map((entry, index) => {
                const product =
                  entry.product_variants?.products?.name ??
                  entry.product_variants?.products?.product_name ??
                  `صنف #${entry.product_variant_id}`;
                const unit = Number(entry.unit_price ?? 0);
                return (
                  <tr
                    key={
                      entry.customer_return_item_id ??
                      `${entry.product_variant_id}-${index}`
                    }
                  >
                    <td className="p-3 font-bold text-brand">{product}</td>
                    <td className="p-3">
                      {entry.product_variants?.size ?? "—"}
                    </td>
                    <td className="p-3">{entry.quantity}</td>
                    <td className="p-3">{formatMoney(unit)}</td>
                    <td className="p-3 font-black">
                      {formatMoney(unit * entry.quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t bg-brand-50">
              <tr>
                <td colSpan={4} className="p-3 font-black">
                  إجمالي المردود
                </td>
                <td className="p-3 font-black text-brand">
                  {formatMoney(item.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {item.notes && (
          <div className="rounded-xl border p-3 text-sm">
            <span className="text-stone-500">ملاحظات</span>
            <p className="mt-1 font-bold">{item.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
const labels: Record<StatementEntryDto["type"], string> = {
  Order: "طلب",
  OrderCancelled: "طلب ملغى",
  CustomerDebt: "دين يدوي",
  CustomerDebtCancelled: "دين ملغى",
  OpeningBalance: "رصيد افتتاحي",
  OpeningBalanceCancelled: "رصيد افتتاحي ملغى",
  CustomerPurchase: "شراء من الزبون",
  CustomerPurchaseCancelled: "شراء ملغى",
  SalesReturn: "مردود مبيعات",
  PurchaseReturn: "مردود مشتريات",
  ReturnCancelled: "مردود ملغى",
  Payment: "قبض من الزبون",
  Disbursement: "دفع للزبون",
  ReturnedCheck: "شيك راجع",
  PaymentCancelled: "حركة ملغاة",
  WriteOff: "مسامحة",
  WriteOffCancelled: "مسامحة ملغاة",
};
function DebtEditor({
  item,
  customerId,
  onClose,
  onSaved,
}: {
  item: CustomerDebtDto | "new" | null;
  customerId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const cur = item && item !== "new" ? item : null,
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    const value = item && item !== "new" ? item : null;
    setAmount(value?.amount ?? "");
    setDate(
      value?.debt_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    );
    setReason(value?.reason ?? "");
    setNotes(value?.notes ?? "");
    setError("");
  }, [item]);
  if (!item) return null;
  const save = async () => {
    if (Number(amount) <= 0 || !reason.trim())
      return setError("المبلغ والسبب مطلوبان.");
    setSaving(true);
    try {
      const data = {
        amount: Number(amount),
        debt_date: `${date}T00:00:00`,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      };
      if (cur) await customersService.updateDebt(cur.id, data);
      else await customersService.createDebt(customerId, data);
      onSaved();
    } catch (e) {
      setError(apiMessages(e, "تعذر الحفظ.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={cur ? "تعديل دين يدوي" : "إضافة دين يدوي"}
    >
      <div className="space-y-3">
        {error && <div className="rep-error">{error}</div>}
        <input
          className="rep-control"
          type="number"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="المبلغ"
        />
        <StyledDatePicker label="التاريخ" value={date} onChange={setDate} />
        <input
          className="rep-control"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="السبب"
        />
        <textarea
          className="rep-control"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات"
        />
        <button
          className="btn-primary w-full"
          disabled={saving}
          onClick={() => void save()}
        >
          حفظ
        </button>
      </div>
    </Modal>
  );
}
function OpeningEditor({
  item,
  customerId,
  onClose,
  onSaved,
}: {
  item: CustomerOpeningBalanceDto | "new" | null;
  customerId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const cur = item && item !== "new" ? item : null,
    [direction, setDirection] = useState<"DueFromCustomer" | "DueToCustomer">(
      "DueFromCustomer",
    ),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    const value = item && item !== "new" ? item : null;
    setDirection(
      value?.direction === "Credit" ? "DueToCustomer" : "DueFromCustomer",
    );
    setAmount(value?.amount ?? "");
    setDate(
      value?.effective_at?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
    );
    setNotes(value?.notes ?? "");
    setError("");
  }, [item]);
  if (!item) return null;
  const save = async () => {
    if (Number(amount) <= 0) return setError("أدخل مبلغًا صحيحًا.");
    setSaving(true);
    try {
      const data = {
        direction,
        amount: Number(amount),
        effective_at: `${date}T00:00:00`,
        notes: notes.trim() || undefined,
      };
      if (cur)
        await customersService.updateOpeningBalance(
          cur.customer_account_adjustment_id,
          data,
        );
      else await customersService.createOpeningBalance(customerId, data);
      onSaved();
    } catch (e) {
      setError(apiMessages(e, "تعذر الحفظ.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={
        cur ? "تعديل الرصيد أو الدين الافتتاحي" : "إضافة رصيد أو دين افتتاحي"
      }
    >
      <div className="space-y-3">
        {error && <div className="rep-error">{error}</div>}
        <Select
          label="النوع"
          value={direction}
          onChange={(v) => setDirection(v as typeof direction)}
          options={[
            { value: "DueFromCustomer", label: "دين افتتاحي على الزبون" },
            { value: "DueToCustomer", label: "رصيد افتتاحي لصالح الزبون" },
          ]}
        />
        <input
          className="rep-control"
          type="number"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="المبلغ"
        />
        <StyledDatePicker
          label="التاريخ الفعلي"
          value={date}
          onChange={setDate}
        />
        <textarea
          className="rep-control"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="ملاحظات"
        />
        <button
          className="btn-primary w-full"
          disabled={saving}
          onClick={() => void save()}
        >
          حفظ
        </button>
      </div>
    </Modal>
  );
}
