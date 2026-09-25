import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  CircleCheck,
  MessageSquareText,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  customersService,
  currenciesService,
  ordersService,
  paymentsService,
  type CustomerSelectionDto,
  type PaymentMethod,
} from "@/api";
import QuantityInput from "@/components/ui/QuantityInput";
import { useOptionalWholesaleStockVisibility, useWholesaleCart } from "@/rep";
import { apiMessages, formatMoney } from "./repOrderUtils";
import { RepDateInput, RepFormSection, RepSelect } from "./RepFormControls";
import RepProductPicker, { type PickedOrderItem } from "./RepProductPicker";
import { useCustomerLookup } from "./useCustomerLookup";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface PaymentDraft {
  key: string;
  amount: string;
  payment_method: PaymentMethod;
  check_number: string;
  account_number: string;
  bank_number: string;
  branch_number: string;
  due_date: string;
  notes: string;
}
const emptyPayment = (paymentMethod: PaymentMethod = "Cash"): PaymentDraft => ({
  key: crypto.randomUUID(),
  amount: "",
  payment_method: paymentMethod,
  check_number: "",
  account_number: "",
  bank_number: "",
  branch_number: "",
  due_date: "",
  notes: "",
});

function addMonthsToDate(value: string, months: number) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  const targetMonth = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  const result = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(day, lastDay));
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, "0")}-${String(result.getDate()).padStart(2, "0")}`;
}

export default function CreateWholesaleOrderPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const { items, updateQuantity, removeItem, clearCart } = useWholesaleCart();
  const showWholesaleStock = useOptionalWholesaleStockVisibility()?.showWholesaleStock ?? false;
  const [fields, setFields] = useState({
    customer_name: "",
    phone: "",
    email: "",
    delivery_address: "",
    notes: "",
    order_discount: "",
  });
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const [checksToAdd, setChecksToAdd] = useState("1");
  const [openPaymentNotes, setOpenPaymentNotes] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerSelectionDto[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const selectedCustomerSearch = useRef("");
  const [itemOptions, setItemOptions] = useState<Record<number, { unitPrice: string; bonusQuantity: number }>>({});
  const [bonusItems, setBonusItems] = useState<PickedOrderItem[]>([]);
  const [bonusPickerOpen, setBonusPickerOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const fillCustomer = useCallback(
    (customer: { name: string; phone: string; email?: string | null }) =>
      setFields((current) => ({
        ...current,
        customer_name: customer.name,
        phone: customer.phone,
        email: customer.email || current.email,
      })),
    [],
  );
  const customerLookup = useCustomerLookup(fields.phone, fillCustomer);
  useEffect(() => {
    if (customerSearch.trim() === selectedCustomerSearch.current) {
      setCustomerSearchLoading(false);
      return;
    }
    selectedCustomerSearch.current = "";
    const value = customerSearch.trim();
    if (value.length < 2) { setCustomerResults([]); setCustomerSearchLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCustomerSearchLoading(true);
      customersService.list({ page: 1, limit: 8, search: value }, controller.signal)
        .then((response) => setCustomerResults(response.customers))
        .catch((reason) => { if (!controller.signal.aborted) setErrors(apiMessages(reason, "تعذر البحث عن الزبون.")); })
        .finally(() => { if (!controller.signal.aborted) setCustomerSearchLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [customerSearch]);
  const selectCustomer = (customer: CustomerSelectionDto) => {
    setFields((current) => ({ ...current, customer_name: customer.name, phone: customer.phone, email: customer.email ?? "" }));
    selectedCustomerSearch.current = customer.name.trim();
    setCustomerSearch(customer.name);
    setCustomerResults([]);
    setCustomerSearchLoading(false);
    void customerLookup.lookup(customer.phone);
  };
  const updatePayment = (index: number, change: Partial<PaymentDraft>) => setPayments((current) => current.map((payment, itemIndex) => itemIndex === index ? { ...payment, ...change } : payment));
  const togglePaymentNote = (key: string) => setOpenPaymentNotes((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const previewSubtotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(itemOptions[item.product_variant_id]?.unitPrice ?? (Number(item.display_price) - Number(item.display_discount)))) *
        item.quantity,
    0,
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setErrors([]);
    if (
      !fields.customer_name.trim() ||
      !fields.phone.trim() ||
      items.length === 0
    ) {
      setErrors(["اسم العميل والهاتف ووجود منتج واحد على الأقل مطلوبة."]);
      return;
    }
    if (items.some((item) => item.quantity + (itemOptions[item.product_variant_id]?.bonusQuantity ?? 0) > item.last_known_stock)) {
      setErrors(["إجمالي الكمية العادية والبونص يتجاوز المخزون المتاح لأحد الخيارات."]);
      return;
    }
    if (bonusItems.some((item) => item.quantity < 1 || item.quantity > item.stock)) {
      setErrors(["راجع كميات أصناف البونص والمخزون المتاح."]);
      return;
    }
    if (
      payments.some((payment) => !payment.amount || Number(payment.amount) <= 0)
    ) {
      setErrors(["يجب أن يكون مبلغ كل سند قبض أكبر من صفر."]);
      return;
    }
    const invalidCheck = payments.some(
      (payment) =>
        payment.payment_method === "Check" && !payment.check_number.trim(),
    );
    if (invalidCheck) {
      setErrors(["رقم الشيك مطلوب عند اختيار الدفع بالشيك."]);
      return;
    }
    setConfirmOpen(true);
  };

  const createOrder = async () => {
    setSubmitting(true);
    try {
      const response = await ordersService.createWholesale({
        customer_name: fields.customer_name.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        delivery_address: fields.delivery_address.trim() || undefined,
        notes: fields.notes.trim() || undefined,
        order_discount: fields.order_discount
          ? Number(fields.order_discount)
          : undefined,
        items: [...items.flatMap((item) => {
          const options = itemOptions[item.product_variant_id];
          const normal = { product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: Number(options?.unitPrice ?? (Number(item.display_price) - Number(item.display_discount))), is_bonus: false };
          return options?.bonusQuantity ? [normal, { product_variant_id: item.product_variant_id, quantity: options.bonusQuantity, unit_price: 0, is_bonus: true }] : [normal];
        }), ...bonusItems.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity, unit_price: 0, is_bonus: true }))],
      });
      if (payments.length) {
        try {
          const [balance, currencyResponse] = await Promise.all([
            customersService.findByPhone(fields.phone.trim()),
            currenciesService.list(),
          ]);
          const currencies = Array.isArray(currencyResponse) ? currencyResponse : currencyResponse.items ?? currencyResponse.currencies ?? [];
          const base = currencies.find((currency) => currency.is_base) ?? currencies[0];
          if (!base) throw new Error("لم يتم تعريف العملة الأساسية.");
          for (const payment of payments) {
            await paymentsService.createForCustomer(balance.customer.id, {
              amount: Number(payment.amount),
              currency_id: base.currency_id,
              exchange_rate: 1,
              payment_method: payment.payment_method,
              notes: payment.notes.trim() || undefined,
              check: payment.payment_method === "Check" ? {
                check_number: payment.check_number.trim(),
                account_number: payment.account_number.trim() || undefined,
                bank_number: payment.bank_number.trim() || undefined,
                branch_number: payment.branch_number.trim() || undefined,
                due_date: payment.due_date || undefined,
              } : undefined,
            });
          }
        } catch (paymentError) {
          setConfirmOpen(false);
          clearCart();
          setErrors([`تم إنشاء الطلب #${response.order.order_id}، لكن تعذر إنشاء سند القبض: ${apiMessages(paymentError, "راجع حساب الزبون وسجّل السند يدويًا.").join("، ")}`]);
          return;
        }
      }
      setConfirmOpen(false);
      clearCart();
      onNavigate(`/rep/orders/${response.order.order_id}`);
    } catch (error) {
      setConfirmOpen(false);
      setErrors(apiMessages(error, "تعذر إنشاء الطلب."));
    } finally {
      setSubmitting(false);
    }
  };
  if (items.length === 0)
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-stone-300" />
        <h1 className="mt-4 text-2xl font-black text-brand">
          سلة الجملة فارغة
        </h1>
        <p className="mt-2 text-stone-500">
          اختر منتجًا وخيارًا واحدًا على الأقل لإنشاء الطلب.
        </p>
        <button
          onClick={() => onNavigate("/rep/products")}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-black text-white"
        >
          تصفح المنتجات
        </button>
      </div>
    );
  return (
    <>
      <form onSubmit={submit} className="space-y-5 pb-24">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-6 py-5 shadow-[0_8px_30px_-26px_rgba(22,46,33,.5)]">
          <div>
            <p className="text-xs font-black text-gold-dark">طلب جملة جديد</p>
            <h1 className="mt-1 text-2xl font-black text-brand">إنشاء الطلب</h1>
        <p className="mt-1 text-sm text-stone-500">أدخل بيانات الزبون، راجع الأصناف، ثم أضف سندات القبض الاختيارية على حسابه.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
            <span className="rounded-full bg-brand px-3 py-1.5 text-white">1 البيانات</span>
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand">2 الأصناف</span>
            <span className="rounded-full bg-stone-100 px-3 py-1.5">3 سندات القبض</span>
          </div>
        </header>
        {errors.length > 0 && (
          <div className="rep-error" role="alert">

            {errors.join("، ")}
          </div>
        )}
        <div className="space-y-5">
          <div className="space-y-5">
            <RepFormSection
              title="بيانات الزبون"
              description="ابحث عن الزبون لاختيار بياناته وعرض رصيده المستحق تلقائيًا"
              icon={<UserRound className="h-5 w-5" />}
              className="w-full"
            >
              <div className="relative mb-4 rounded-xl border border-brand/15 bg-brand-50/40 p-3">
                <label><span className="rep-label">البحث عن زبون مسجل</span><span className="relative block"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"/><input className="rep-control pr-9" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف"/></span></label>
                {customerSearchLoading && <p className="mt-2 text-xs font-bold text-stone-500">جاري البحث…</p>}
                {customerResults.length > 0 && <div className="absolute inset-x-4 top-[calc(100%-8px)] z-20 max-h-60 overflow-y-auto rounded-xl border bg-white p-1 shadow-xl">{customerResults.map((customer) => <button type="button" key={customer.customer_id} onClick={() => selectCustomer(customer)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right hover:bg-brand-50"><span><b className="block text-sm text-brand">{customer.name}</b><small className="text-stone-500" dir="ltr">{customer.phone}</small></span><span className="text-xs font-bold text-gold-dark">اختيار</span></button>)}</div>}
              </div>
              {customerLookup.state === "loading" && <div className="mb-4 rounded-xl border border-brand/10 bg-brand-50 px-4 py-3 text-sm font-bold text-brand">جاري تحميل بيانات الزبون ورصيده…</div>}
              {customerLookup.state === "found" && <div className="mb-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <LookupNote success icon={<CircleCheck className="h-4 w-4" />} text="تم العثور على بيانات الزبون وتعبئتها" />
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2"><span className="text-xs font-bold text-stone-600">الدين المستحق</span><strong className="text-base text-amber-800">{formatMoney(customerLookup.customer?.total_outstanding_amount ?? "0")}</strong></div>
              </div>}
              {customerLookup.state === "new" && <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><LookupNote text="لا يوجد زبون بهذا الرقم — أكمل البيانات كزبون جديد" /></div>}
              {customerLookup.state === "error" && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{customerLookup.messages.join("، ")}</div>}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                <div className="xl:col-span-3"><Field label="اسم الزبون *" value={fields.customer_name} onChange={(value) => setFields({ ...fields, customer_name: value })}/></div>
                <div className="xl:col-span-4">
                  <Field label="رقم الهاتف *" value={fields.phone} onChange={(value) => setFields({ ...fields, phone: value })}/>
                </div>
                <div className="xl:col-span-3"><Field label="البريد الإلكتروني" type="email" value={fields.email} onChange={(value) => setFields({ ...fields, email: value })}/></div>
                <div className="xl:col-span-2"><Field label="خصم الطلب" type="number" value={fields.order_discount} onChange={(value) => setFields({ ...fields, order_discount: value })}/></div>
                <div className="xl:col-span-4"><Field label="عنوان التسليم" value={fields.delivery_address} onChange={(value) => setFields({ ...fields, delivery_address: value })}/></div>
                <label className="md:col-span-2 xl:col-span-8">
                  <span className="rep-label">ملاحظات</span>
                  <textarea
                    rows={2}
                    className="rep-control resize-y"
                    value={fields.notes}
                    onChange={(e) =>
                      setFields({ ...fields, notes: e.target.value })
                    }
                  />
                </label>
              </div>
            </RepFormSection>
            <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_8px_30px_-24px_rgba(22,46,33,.45)]">
              <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-stone-100 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 min-w-7 place-items-center rounded-full bg-brand px-2 text-xs font-black text-white">{items.length}</span>
                    <h2 className="text-lg font-black text-brand">أصناف الطلب</h2>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">عدّل السعر والكمية والبونص مباشرة من الصف.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => onNavigate("/rep/products")} className="rounded-lg border border-brand/15 bg-white px-4 py-2 text-xs font-black text-brand hover:bg-brand-50">+ إضافة منتجات</button>
                  <button type="button" onClick={() => setConfirmClearCart(true)} className="rounded-lg border border-transparent px-4 py-2 text-xs font-black text-red-600 hover:border-red-100 hover:bg-red-50">مسح السلة</button>
                </div>
              </header>
              <div className="max-h-[480px] overflow-auto">
                <div className="min-w-[960px]">
                  <div className="sticky top-0 z-10 grid grid-cols-[minmax(300px,1fr)_140px_190px_130px_130px_44px] gap-5 border-b border-stone-100 bg-stone-50 px-6 py-2.5 text-xs font-black text-stone-500">
                    <span>الصنف</span><span className="text-center">السعر</span><span className="text-center">الكمية</span><span className="text-center">البونص</span><span className="text-center">الإجمالي</span><span />
                  </div>
                  <div className="divide-y divide-stone-100">
                    {items.map((item) => {
                      const unitPrice = Number(itemOptions[item.product_variant_id]?.unitPrice ?? Math.max(0, Number(item.display_price) - Number(item.display_discount)));
                      return <article key={item.product_variant_id} className="grid grid-cols-[minmax(300px,1fr)_140px_190px_130px_130px_44px] items-center gap-5 px-6 py-4 hover:bg-stone-50/60">
                        <div className="min-w-0"><strong className="block truncate text-sm text-brand">{item.product_name}</strong><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500"><span>{item.size} — {item.color}</span><span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px]">السعر الأساسي {formatMoney(item.display_price)}</span></div></div>
                        <label><span className="sr-only">السعر الفعلي</span><input className="rep-control min-h-10 py-2" type="number" min="0" step="0.01" value={itemOptions[item.product_variant_id]?.unitPrice ?? String(unitPrice)} onChange={(event) => setItemOptions((all) => ({ ...all, [item.product_variant_id]: { unitPrice: event.target.value, bonusQuantity: all[item.product_variant_id]?.bonusQuantity ?? 0 } }))}/></label>
                        <QuantityInput value={item.quantity} max={item.last_known_stock} onChange={(quantity) => updateQuantity(item.product_variant_id, quantity)} showStock={showWholesaleStock} />
                        <label><span className="sr-only">كمية البونص</span><input className="rep-control min-h-10 border-gold/30 bg-gold/5 py-2 text-center" type="number" min="0" max={item.last_known_stock} step="1" value={itemOptions[item.product_variant_id]?.bonusQuantity ?? 0} onChange={(event) => setItemOptions((all) => ({ ...all, [item.product_variant_id]: { unitPrice: all[item.product_variant_id]?.unitPrice ?? String(unitPrice), bonusQuantity: Math.max(0, Number(event.target.value)) } }))}/></label>
                        <strong className="text-center text-base text-gold-dark">{formatMoney(unitPrice * item.quantity)}</strong>
                        <button type="button" onClick={() => setItemToRemove({ id: item.product_variant_id, name: item.product_name })} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`حذف ${item.product_name}`}><Trash2 className="h-4 w-4" /></button>
                      </article>;
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-start gap-5 border-t border-stone-200 bg-stone-50/70 px-6 py-3">
                <span className="text-sm font-bold text-stone-500">الإجمالي قبل الخصم</span>
                <strong className="text-xl text-gold-dark">{formatMoney(previewSubtotal)}</strong>
              </div>
            </section>
            <RepFormSection
              title="أصناف البونص"
              description="اختياري — يمكن اختيار أي صنف كبونص حتى لو لم يكن ضمن أصناف الفاتورة"
              className="w-full"
              action={<button type="button" onClick={() => setBonusPickerOpen(true)} className="rounded-lg bg-gold/15 px-3 py-2 text-xs font-black text-brand hover:bg-gold/25">+ اختيار صنف بونص</button>}
            >
              {bonusItems.length === 0 ? <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-5 text-center text-sm text-stone-500">لا توجد أصناف بونص مستقلة.</p> : <div className="space-y-3">{bonusItems.map((item, index) => <div key={`${item.product_variant_id}-${index}`} className="grid items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 sm:grid-cols-[1fr_150px_auto]"><div><b className="text-sm text-brand">{item.label}</b><p className="mt-1 text-xs font-bold text-gold-dark">بونص · السعر صفر</p></div><QuantityInput value={item.quantity} max={item.stock} onChange={(quantity) => setBonusItems((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, quantity } : entry))}/><button type="button" className="justify-self-end rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setBonusItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="حذف صنف البونص"><Trash2 className="h-5 w-5"/></button></div>)}</div>}
            </RepFormSection>
            <RepFormSection
              title="سندات قبض بعد إنشاء الطلب"
              description="اختياري — تُسجل على حساب الزبون ولا ترتبط بالطلب"
              className="w-full"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPayments((current) => [...current, emptyPayment("Cash")])} className="rounded-lg border border-brand/15 bg-white px-3 py-2 text-xs font-black text-brand hover:bg-brand-50">+ سند قبض نقدي</button>
                  <div className="flex items-center overflow-hidden rounded-lg border border-brand/15 bg-white">
                    <input aria-label="عدد الشيكات المراد إضافتها" className="h-9 w-14 border-0 px-2 text-center text-sm font-bold outline-none" type="number" min="1" max="60" value={checksToAdd} onChange={(event) => setChecksToAdd(event.target.value)}/>
                    <button type="button" onClick={() => {
                      const count = Math.min(60, Math.max(1, Number(checksToAdd) || 1));
                      setPayments((current) => {
                        const previousCheck = [...current].reverse().find((payment) => payment.payment_method === "Check");
                        const numericCheckNumber = previousCheck?.check_number.trim() && /^\d+$/.test(previousCheck.check_number.trim()) ? Number(previousCheck.check_number.trim()) : null;
                        const additions = Array.from({ length: count }, (_, offset) => ({
                          ...emptyPayment("Check"),
                          amount: previousCheck?.amount ?? "",
                          check_number: numericCheckNumber === null ? "" : String(numericCheckNumber + offset + 1),
                          account_number: previousCheck?.account_number ?? "",
                          bank_number: previousCheck?.bank_number ?? "",
                          branch_number: previousCheck?.branch_number ?? "",
                          due_date: previousCheck?.due_date ? addMonthsToDate(previousCheck.due_date, offset + 1) : "",
                          notes: previousCheck?.notes ?? "",
                        }));
                        return [...current, ...additions];
                      });
                      setChecksToAdd("1");
                    }} className="h-9 bg-brand-50 px-3 text-xs font-black text-brand hover:bg-brand-100">+ إضافة شيكات</button>
                  </div>
                </div>
              }
            >
              {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 px-5 py-8 text-center">
                  <p className="text-sm font-bold text-stone-600">لا توجد سندات قبض</p>
                  <p className="mt-1 text-xs text-stone-400">يمكن إنشاء الطلب دون قبض، أو إصدار سند قبض نقدي أو بشيك بعد نجاح الطلب.</p>
                </div>
              ) : (
                <div className="max-h-[520px] overflow-auto rounded-xl border border-stone-200">
                  <table className="w-full min-w-[1020px] border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-stone-50 text-stone-600 shadow-[0_1px_0_0_rgba(0,0,0,.06)]"><tr><th className="w-12 p-2 text-center">#</th><th className="w-28 p-2 text-right">الطريقة</th><th className="w-28 p-2 text-right">المبلغ</th><th className="w-32 p-2 text-right">رقم الشيك</th><th className="w-32 p-2 text-right">الحساب</th><th className="w-24 p-2 text-right">البنك</th><th className="w-24 p-2 text-right">الفرع</th><th className="w-36 p-2 text-right">الاستحقاق</th><th className="w-24 p-2" /></tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {payments.map((payment, index) => { const check = payment.payment_method === "Check"; const noteOpen = openPaymentNotes.has(payment.key); const inputClass = "h-9 w-full rounded-lg border border-stone-200 bg-white px-2 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/10 disabled:border-transparent disabled:bg-stone-50 disabled:text-transparent"; return <Fragment key={payment.key}><tr className="hover:bg-stone-50/60">
                        <td className="p-2 text-center font-black text-stone-400">{index + 1}</td>
                        <td className="p-1.5"><RepSelect value={payment.payment_method} options={[{ value: "Cash", label: "نقدًا" }, { value: "Check", label: "شيك" }]} onChange={(payment_method) => updatePayment(index, { payment_method })}/></td>
                        <td className="p-1.5"><input className={inputClass} type="number" min="0.01" step="0.01" placeholder="0.00" value={payment.amount} onChange={(event) => updatePayment(index, { amount: event.target.value })}/></td>
                        <td className="p-1.5">{check ? <input className={inputClass} value={payment.check_number} onChange={(event) => updatePayment(index, { check_number: event.target.value })}/> : <span className="block text-center text-stone-300">—</span>}</td>
                        <td className="p-1.5">{check ? <input className={inputClass} value={payment.account_number} onChange={(event) => updatePayment(index, { account_number: event.target.value })}/> : <span className="block text-center text-stone-300">—</span>}</td>
                        <td className="p-1.5">{check ? <input className={inputClass} value={payment.bank_number} onChange={(event) => updatePayment(index, { bank_number: event.target.value })}/> : <span className="block text-center text-stone-300">—</span>}</td>
                        <td className="p-1.5">{check ? <input className={inputClass} value={payment.branch_number} onChange={(event) => updatePayment(index, { branch_number: event.target.value })}/> : <span className="block text-center text-stone-300">—</span>}</td>
                        <td className="p-1.5">{check ? <RepDateInput value={payment.due_date} onChange={(due_date) => updatePayment(index, { due_date })}/> : <span className="block text-center text-stone-300">—</span>}</td>
                        <td className="p-1.5"><div className="flex items-center justify-center gap-1"><button type="button" onClick={() => togglePaymentNote(payment.key)} className={`relative grid h-8 w-8 place-items-center rounded-lg transition ${payment.notes ? "bg-gold/15 text-gold-dark" : noteOpen ? "bg-brand-50 text-brand" : "text-stone-400 hover:bg-stone-100"}`} aria-label={noteOpen ? "إخفاء الملاحظة" : "إضافة ملاحظة"} aria-expanded={noteOpen}><MessageSquareText className="h-4 w-4" />{payment.notes && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-dark" />}</button><button type="button" onClick={() => { setPayments((current) => current.filter((_, itemIndex) => itemIndex !== index)); setOpenPaymentNotes((current) => { const next = new Set(current); next.delete(payment.key); return next; }); }} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`حذف سند القبض ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div></td>
                      </tr>{noteOpen && <tr className="bg-stone-50/70"><td colSpan={9} className="px-4 py-2"><div className="flex items-center gap-3"><span className="shrink-0 text-xs font-bold text-stone-500">ملاحظة السند</span><input autoFocus className="h-9 flex-1 rounded-lg border border-stone-200 bg-white px-3 outline-none focus:border-gold focus:ring-2 focus:ring-gold/10" placeholder="اكتب ملاحظة اختيارية…" value={payment.notes} onChange={(event) => updatePayment(index, { notes: event.target.value })}/><button type="button" onClick={() => togglePaymentNote(payment.key)} className="rounded-lg px-3 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100">إغلاق</button></div></td></tr>}</Fragment>; })}
                    </tbody>
                  </table>
                </div>
              )}
              {payments.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50/60 px-4 py-3 text-xs text-stone-500"><span>{payments.length} سندات قبض · {payments.filter((payment) => payment.payment_method === "Check").length} شيكات</span><b className="text-sm text-brand">إجمالي القبض: {formatMoney(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}</b></div>}
            </RepFormSection>
          </div>
        </div>
        <footer className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/15 bg-white/95 px-5 py-4 shadow-[0_18px_55px_-18px_rgba(22,46,33,.4)] backdrop-blur">
          <div className="flex items-center gap-8">
            <div><span className="block text-xs font-bold text-stone-500">إجمالي الطلب بعد الخصم</span><strong className="text-2xl text-gold-dark">{formatMoney(Math.max(0, previewSubtotal - Number(fields.order_discount || 0)))}</strong></div>
            <div className="hidden sm:block"><span className="block text-xs font-bold text-stone-500">سندات القبض</span><strong className="text-sm text-brand">{formatMoney(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))}</strong></div>
          </div>
          <button disabled={submitting} className="min-h-12 rounded-xl bg-brand px-8 font-black text-white shadow-lg shadow-brand/15 transition hover:bg-brand-700 disabled:opacity-60">{submitting ? "جاري إنشاء الطلب…" : "مراجعة وتأكيد الطلب"}</button>
        </footer>
      </form>
      <RepProductPicker
        open={bonusPickerOpen}
        existing={[...items.map((item) => ({ product_variant_id: item.product_variant_id, quantity: item.quantity })), ...bonusItems]}
        onClose={() => setBonusPickerOpen(false)}
        onAdd={(picked) => {
          setBonusItems((current) => {
            const existing = current.find((item) => item.product_variant_id === picked.product_variant_id);
            return existing
              ? current.map((item) => item.product_variant_id === picked.product_variant_id ? { ...item, quantity: item.quantity + picked.quantity } : item)
              : [...current, picked];
          });
          setBonusPickerOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void createOrder()}
        loading={submitting}
        severity="normal"
        title="تأكيد إنشاء طلب الجملة"
        message="هل أنت متأكد أنك تريد إنشاء هذا الطلب؟"
        confirmLabel="إنشاء الطلب"
        details={
          <div className="space-y-1">
            <p>
              الزبون: <strong>{fields.customer_name}</strong>
            </p>
            <p>
              عدد المنتجات: <strong>{items.length}</strong>
            </p>
            <p>
              الإجمالي التقريبي:{" "}
              <strong>
                {formatMoney(
                  Math.max(
                    0,
                    previewSubtotal - Number(fields.order_discount || 0),
                  ),
                )}
              </strong>
            </p>
          </div>
        }
      />
      <ConfirmDialog
        open={confirmClearCart}
        onClose={() => setConfirmClearCart(false)}
        onConfirm={() => { clearCart(); setConfirmClearCart(false); }}
        severity="destructive"
        title="مسح سلة الجملة"
        message="هل أنت متأكد أنك تريد تفريغ السلة؟ سيتم حذف جميع المنتجات منها."
        confirmLabel="مسح السلة"
      />
      <ConfirmDialog
        open={itemToRemove !== null}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove) removeItem(itemToRemove.id);
          setItemToRemove(null);
        }}
        severity="destructive"
        title="إزالة المنتج"
        message={`هل أنت متأكد أنك تريد إزالة "${itemToRemove?.name ?? ""}" من طلب الجملة؟ ستفقد الكمية والخيار المحدد.`}
        confirmLabel="إزالة المنتج"
      />
    </>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="rep-label">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        className="rep-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function LookupNote({
  icon,
  text,
  success = false,
}: {
  icon?: React.ReactNode;
  text: string;
  success?: boolean;
}) {
  return (
    <p
      className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${success ? "text-emerald-700" : "text-stone-500"}`}
    >
      {icon}
      {text}
    </p>
  );
}
