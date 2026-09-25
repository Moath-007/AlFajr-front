import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CheckCircle2,
  Clock3,
  PackageX,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { dashboardService, type AdminDashboardResponseDto } from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/rep/RepOrderUi";
import { RepDateInput } from "@/components/rep/RepFormControls";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";

const STOCK_THRESHOLD_STORAGE_KEY = "owner-dashboard-stock-threshold";

function savedStockThreshold() {
  const value = Number(localStorage.getItem(STOCK_THRESHOLD_STORAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : 5;
}

export default function OwnerDashboard({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [data, setData] = useState<AdminDashboardResponseDto | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [allTime, setAllTime] = useState(false);
  const [initialStockThreshold] = useState(savedStockThreshold);
  const [stockThreshold, setStockThreshold] = useState(
    String(initialStockThreshold),
  );
  const [appliedStockThreshold, setAppliedStockThreshold] = useState(
    initialStockThreshold,
  );
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const load = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      return dashboardService
        .get(
          {
            date_from: appliedFrom || undefined,
            date_to: appliedTo || undefined,
            range: allTime ? "all_time" : "current_month",
            low_stock_threshold: appliedStockThreshold,
          },
          signal,
        )
        .then(setData)
        .catch((error) => {
          if (!signal?.aborted)
            setErrors(apiMessages(error, "تعذر تحميل لوحة التحكم."));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [allTime, appliedFrom, appliedStockThreshold, appliedTo],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, retryKey]);
  const applyDates = () => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setErrors(["تاريخ البداية يجب أن يسبق تاريخ النهاية."]);
      return;
    }
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setAllTime(false);
  };
  const resetDates = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setAllTime(false);
  };
  const applyStockThreshold = () => {
    const threshold = Number(stockThreshold);
    if (!Number.isInteger(threshold) || threshold < 1) {
      setErrors(["حد المخزون المنخفض يجب أن يكون عددًا صحيحًا أكبر من صفر."]);
      return;
    }
    localStorage.setItem(STOCK_THRESHOLD_STORAGE_KEY, String(threshold));
    setAppliedStockThreshold(threshold);
  };
  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden pb-10 [font-variant-numeric:tabular-nums] sm:space-y-7 sm:pb-14">
      <header className="relative overflow-hidden rounded-[22px] bg-gradient-to-l from-brand via-brand-800 to-brand-700 px-5 py-6 text-white shadow-[0_18px_45px_-28px_rgba(15,31,22,0.7)] sm:rounded-[28px] sm:px-8 sm:py-7">
        <span className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full border-[32px] border-white/5" />
        <span className="pointer-events-none absolute -bottom-24 left-36 h-44 w-44 rounded-full bg-gold/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black text-gold-200">نظرة تشغيلية</p>
          <h1 className="mt-3 text-[28px] font-black tracking-tight sm:text-4xl">لوحة التحكم</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
            ملخص مباشر للمبيعات والطلبات والمستحقات والمخزون.
          </p>
        </div>
        {data?.date_semantics?.timezone && (
          <span className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs font-bold text-white/60 backdrop-blur-sm">
            التوقيت: {data.date_semantics.timezone}
          </span>
        )}
        </div>
      </header>
      <section className="rounded-2xl border border-stone-200/80 bg-white p-3 shadow-[0_8px_30px_-24px_rgba(15,31,22,0.5)] sm:p-4">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[220px_220px_auto_auto_auto_1fr]">
          <RepDateInput
            label="من تاريخ"
            value={dateFrom}
            onChange={setDateFrom}
            max={dateTo || undefined}
          />
          <RepDateInput
            label="إلى تاريخ"
            value={dateTo}
            onChange={setDateTo}
            min={dateFrom || undefined}
          />
          <button
            onClick={applyDates}
            className="min-h-11 rounded-xl bg-brand px-5 text-sm font-black text-white shadow-sm transition hover:bg-brand-700"
          >
            تطبيق
          </button>
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setAppliedFrom("");
              setAppliedTo("");
              setAllTime(true);
            }}
            className={`min-h-11 rounded-xl border px-4 text-sm font-black transition ${allTime ? "border-brand bg-brand text-white shadow-sm" : "border-stone-200 bg-stone-50 text-brand hover:border-brand-200 hover:bg-brand-50"}`}
          >
            كل الوقت
          </button>
          {(allTime || dateFrom || dateTo || appliedFrom || appliedTo) && (
            <button
              onClick={resetDates}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-stone-600"
            >
              <RotateCcw className="h-4 w-4" /> الفترة الافتراضية
            </button>
          )}
          <p className="text-xs text-stone-400 lg:text-left">
            {allTime ? "المعروض حاليًا: كل الوقت." : appliedFrom || appliedTo ? "المعروض حاليًا: الفترة المحددة." : "المعروض حاليًا: الشهر الحالي حتى اليوم."}
          </p>
        </div>
      </section>
      {errors.length > 0 && (
        <div className="rep-error text-center" role="alert">
          <p>{errors.join("، ")}</p>
          <button
            onClick={() => setRetryKey((value) => value + 1)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <DashboardLoading />
      ) : (
        data && (
          <>
            <section aria-label="المؤشرات الرئيسية" className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              <FinancialCard
                icon={TrendingUp}
                label="إجمالي المبيعات"
                value={data.summary.completed_sales_total}
                hint="قيمة جميع طلبات البيع غير الملغاة"
              />
              <CollectionCard
                cash={data.collections.cash}
                collectedChecks={data.checks.collected.amount}
              />
              <Metric
                icon={AlertTriangle}
                label="ديون الزبائن الحالية"
                value={formatMoney(data.summary.outstanding_amount)}
                hint="الرصيد المطلوب حاليًا من جميع الزبائن"
                tone="red"
              />
              <OrdersSummaryCard
                completed={data.summary.completed_orders_count}
                pending={data.summary.pending_orders_count}
                pendingValue={data.summary.pending_orders_total}
              />
            </section>
            <section className="min-w-0 rounded-[20px] border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-26px_rgba(15,31,22,0.45)] sm:rounded-[24px] sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div><p className="text-[11px] font-black uppercase tracking-wider text-gold-dark">التحصيل</p><h2 className="mt-1 text-xl font-black text-brand">حالة الشيكات المستلمة</h2></div>
                <p className="text-xs text-stone-500">الشيك قيد التحصيل لا يدخل ضمن التحصيل الفعلي.</p>
              </div>
            <section className="grid gap-3 md:grid-cols-3">
              <CheckStatusCard icon={Clock3} label="شيكات معلقة" count={data.checks.pending.count} amount={data.checks.pending.amount} tone="amber" />
              <CheckStatusCard icon={CheckCircle2} label="شيكات محصلة" count={data.checks.collected.count} amount={data.checks.collected.amount} tone="green" />
              <CheckStatusCard icon={AlertTriangle} label="شيكات راجعة" count={data.checks.returned.count} amount={data.checks.returned.amount} tone="red" />
            </section>
            </section>
            <section className="min-w-0 rounded-[20px] border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-26px_rgba(15,31,22,0.45)] sm:rounded-[24px] sm:p-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div><p className="text-[11px] font-black uppercase tracking-wider text-gold-dark">الأرصدة</p>
                <h2 className="mt-1 text-xl font-black text-brand">حسابات الزبائن</h2></div>
                <p className="mt-1 text-xs text-stone-500">أرصدة وحركات تراكمية لكل الوقت، مستقلة عن فترة المبيعات المختارة.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AccountFigure
                  label="مطلوب من الزبائن"
                  value={data.customer_accounts.receivable}
                  detail={`${data.customer_accounts.receivable_customers_count} زبون مدين`}
                  tone="red"
                />
                <AccountFigure
                  label="أرصدة لصالح الزبائن"
                  value={data.customer_accounts.customer_credit}
                  detail={`${data.customer_accounts.customer_credit_customers_count} زبون دائن`}
                  tone="blue"
                />
                <AccountFigure label="مشتريات من الزبائن" value={data.customer_accounts.customer_purchases} detail="تُخفّض رصيد الزبون المطلوب" />
                <AccountFigure label="سندات صرف" value={data.customer_accounts.disbursements} detail="مبالغ دُفعت للزبائن" />
                <AccountFigure label="ديون مضافة" value={data.customer_accounts.added_debts} detail="ديون مسجلة خارج الطلبات" />
                <AccountFigure label="ديون مشطوبة" value={data.customer_accounts.write_offs} detail="مبالغ أُسقطت من الحسابات" />
              </div>
            </section>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <section className="min-w-0 rounded-[20px] border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_-26px_rgba(15,31,22,0.45)] sm:rounded-[24px] sm:p-6">
                <p className="text-[11px] font-black uppercase tracking-wider text-gold-dark">الأداء البيعي</p>
                <h2 className="mt-1 text-xl font-black text-brand">المبيعات حسب النوع</h2>
                <p className="mt-1 text-xs text-stone-500">قيمة جميع طلبات البيع غير الملغاة حسب النوع.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <TypeSales label="أونلاين" sales={data.sales_by_type.retail} />
                  <TypeSales
                    label="جملة"
                    sales={data.sales_by_type.wholesale}
                  />
                  <TypeSales
                    label="بيع محل"
                    sales={data.sales_by_type.store_sale}
                  />
                </div>
                <div className="mt-5 border-t pt-4">
                  <h3 className="text-sm font-black text-brand">الطلبات حسب النوع</h3>
                  <p className="mt-1 text-xs text-stone-500">تشمل الطلبات المكتملة وقيد التنفيذ، ولا تشمل الملغاة.</p>
                </div>
                <OrderTypeDistribution retail={data.orders_by_type.retail} wholesale={data.orders_by_type.wholesale} storeSale={data.orders_by_type.store_sale} />
              </section>
              <section className="min-w-0 rounded-[20px] border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white p-4 shadow-[0_8px_30px_-26px_rgba(146,64,14,0.5)] sm:rounded-[24px] sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-brand">تنبيهات المخزون</h2>
                  <button
                    onClick={() => onNavigate("inventory")}
                    className="text-xs font-black text-gold-dark"
                  >
                    عرض المخزون
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <AlertCount
                    icon={Boxes}
                    label="مخزون منخفض"
                    value={data.stock_alerts.low_stock_variants}
                  />
                  <AlertCount
                    icon={PackageX}
                    label="نفد المخزون"
                    value={data.stock_alerts.out_of_stock_variants}
                  />
                </div>
                <form
                  className="mt-4 rounded-xl border border-amber-200 bg-white p-3 shadow-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyStockThreshold();
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="dashboard-stock-threshold"
                      className="min-w-0"
                    >
                      <span className="block text-xs font-black text-brand">
                        حد التنبيه
                      </span>
                      <span className="mt-0.5 block text-[10px] text-stone-500">
                        منخفض حتى {appliedStockThreshold} قطع
                      </span>
                    </label>
                    <span className="flex shrink-0 items-stretch overflow-hidden rounded-lg border border-stone-200 bg-stone-50 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/15">
                      <input
                        id="dashboard-stock-threshold"
                        type="number"
                        min="1"
                        step="1"
                        value={stockThreshold}
                        onChange={(event) => setStockThreshold(event.target.value)}
                        className="w-16 appearance-none bg-transparent px-2 py-2 text-center text-base font-black text-brand outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        aria-label="حد المخزون المنخفض"
                      />
                      <button
                        className="border-r border-stone-200 bg-brand px-3 text-xs font-black text-white transition hover:bg-brand-800"
                      >
                        تطبيق
                      </button>
                    </span>
                  </div>
                </form>
              </section>
            </div>
            <section className="overflow-hidden rounded-[24px] border border-stone-200/80 bg-white shadow-[0_8px_30px_-26px_rgba(15,31,22,0.45)]">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="font-black text-brand">آخر الطلبات</h2>
                  <p className="mt-1 text-xs text-stone-500">
                    أحدث الطلبات المسجلة
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("orders")}
                  className="text-sm font-black text-gold-dark"
                >
                  عرض الكل
                </button>
              </div>
              {data.recent_orders.length === 0 ? (
                <EmptyState title="لا توجد طلبات حديثة" />
              ) : (
                <>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-stone-50 text-stone-500">
                        <tr>
                          {[
                            "الطلب",
                            "العميل",
                            "النوع",
                            "الحالة",
                            "الإجمالي",
                            "التاريخ",
                          ].map((label) => (
                            <th key={label} className="px-4 py-3 text-right">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.recent_orders.map((order) => (
                          <tr key={order.order_id}>
                            <td className="px-4 py-4 font-black text-brand">
                              #{order.order_id}
                            </td>
                            <td className="px-4 font-bold">
                              {order.customer.name}
                            </td>
                            <td className="px-4">
                              {orderTypeLabel(order.order_type)}
                            </td>
                            <td className="px-4">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-4 font-bold">
                              {formatMoney(order.total_amount)}
                            </td>
                            <td className="whitespace-nowrap px-4 text-stone-500">
                              {formatOrderDate(order.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y md:hidden">
                    {data.recent_orders.map((order) => (
                      <article key={order.order_id} className="space-y-3 p-4">
                        <div className="flex justify-between gap-3">
                          <strong className="text-brand">
                            #{order.order_id} · {order.customer.name}
                          </strong>
                          <span className="text-xs text-stone-400">
                            {formatOrderDate(order.created_at)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <OrderStatusBadge status={order.status} />
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold">
                            {orderTypeLabel(order.order_type)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span>
                            الإجمالي: <b>{formatMoney(order.total_amount)}</b>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
            <section className="rounded-[24px] border border-stone-200/80 bg-white shadow-[0_8px_30px_-26px_rgba(15,31,22,0.45)]">
              <div className="border-b p-5">
                <h2 className="font-black text-brand">ملخص المناديب</h2>
                <p className="mt-1 text-xs text-stone-500">
                  أداء طلبات الجملة المكتملة ضمن الفترة.
                </p>
              </div>
              {data.representatives.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-8 w-8" />}
                  title="لا توجد بيانات مناديب ضمن الفترة"
                />
              ) : (
                <div className="divide-y">
                  {data.representatives.map((rep) => (
                    <div
                      key={rep.representative_id}
                      className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    >
                      <strong>{rep.name}</strong>
                      <span className="text-sm text-stone-500">
                        {rep.completed_orders_count} طلب مكتمل
                      </span>
                      <strong className="text-gold-dark">
                        {formatMoney(rep.completed_sales_total)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  const colors = {
    brand: "bg-brand-50 text-brand",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-stone-200/80 bg-white p-5 shadow-[0_8px_28px_-25px_rgba(15,31,22,0.5)] transition duration-200 hover:-translate-y-0.5 hover:border-stone-300">
      <span className={`absolute inset-x-0 top-0 h-1 ${tone === "red" ? "bg-red-400" : tone === "amber" ? "bg-amber-400" : tone === "green" ? "bg-emerald-500" : "bg-brand"}`} />
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <strong className="mt-5 block break-words text-2xl font-black tracking-tight text-brand sm:text-3xl">{value}</strong>
      <span className="mt-1 block text-sm font-bold text-stone-500">
        {label}
      </span>
      {hint && <span className="mt-2 block text-xs leading-5 text-stone-400">{hint}</span>}
    </article>
  );
}
function FinancialCard({ icon: Icon, label, value, hint }: { icon: typeof TrendingUp; label: string; value: string; hint: string }) {
  return <article className="group relative min-w-0 overflow-hidden rounded-[20px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white p-4 shadow-[0_10px_32px_-25px_rgba(5,150,105,0.65)] transition duration-200 hover:-translate-y-0.5 sm:rounded-[22px] sm:p-5"><span className="absolute inset-x-0 top-0 h-1 bg-emerald-500"/><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><span className="text-sm font-bold text-stone-500">{label}</span><strong className="mt-3 block break-words text-2xl font-black tracking-tight text-brand sm:text-3xl">{formatMoney(value)}</strong></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-11 sm:w-11"><Icon className="h-5 w-5"/></span></div><span className="mt-4 block border-t border-emerald-100 pt-3 text-xs leading-5 text-stone-500">{hint}</span></article>;
}
function CollectionCard({ cash, collectedChecks }: { cash: string; collectedChecks: string }) {
  const total = Number(cash) + Number(collectedChecks);
  return <article className="group relative min-w-0 overflow-hidden rounded-[20px] border border-blue-200/70 bg-gradient-to-br from-blue-50/70 via-white to-white p-4 shadow-[0_10px_32px_-25px_rgba(37,99,235,0.55)] transition duration-200 hover:-translate-y-0.5 sm:rounded-[22px] sm:p-5"><span className="absolute inset-x-0 top-0 h-1 bg-blue-500"/><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><span className="text-sm font-bold text-stone-500">التحصيل الفعلي</span><strong className="mt-3 block break-words text-2xl font-black tracking-tight text-brand sm:text-3xl">{formatMoney(total)}</strong></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700 sm:h-11 sm:w-11"><Banknote className="h-5 w-5"/></span></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-blue-100 pt-3 text-xs sm:gap-3"><div className="min-w-0"><span className="text-stone-400">نقدي مقبوض</span><b className="mt-1 block break-words text-xs text-emerald-700 sm:text-sm">{formatMoney(cash)}</b></div><div className="min-w-0"><span className="text-stone-400">شيكات محصلة</span><b className="mt-1 block break-words text-xs text-blue-700 sm:text-sm">{formatMoney(collectedChecks)}</b></div></div></article>;
}
function OrdersSummaryCard({ completed, pending, pendingValue }: { completed: number; pending: number; pendingValue: string }) {
  return <article className="relative overflow-hidden rounded-[22px] border border-stone-200/80 bg-white p-5 shadow-[0_8px_28px_-25px_rgba(15,31,22,0.5)]"><span className="absolute inset-x-0 top-0 h-1 bg-gold"/><span className="text-sm font-bold text-stone-500">حركة الطلبات</span><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3"><CheckCircle2 className="h-5 w-5 text-emerald-700"/><strong className="mt-2 block text-2xl text-brand">{completed}</strong><span className="text-xs font-bold text-stone-500">مكتملة</span></div><div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3"><Clock3 className="h-5 w-5 text-amber-700"/><strong className="mt-2 block text-2xl text-brand">{pending}</strong><span className="text-xs font-bold text-stone-500">قيد التنفيذ</span></div></div><div className="mt-3 flex items-end justify-between gap-3 border-t pt-3"><span className="max-w-[150px] text-xs leading-5 text-stone-400">قيمة قيد التنفيذ<br/>مشمولة في المبيعات</span><b className="text-sm text-amber-700">{formatMoney(pendingValue)}</b></div></article>;
}
function CheckStatusCard({ icon: Icon, label, count, amount, tone }: { icon: typeof Clock3; label: string; count: number; amount: string; tone: "amber" | "green" | "red" }) {
  const colors = {
    amber: "border-amber-200 bg-amber-50/80 text-amber-800",
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
    red: "border-red-200 bg-red-50/80 text-red-800",
  };
  const iconColors = {
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <article className={`min-w-0 rounded-2xl border p-4 transition hover:-translate-y-0.5 sm:p-5 ${colors[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <b className="min-w-0 text-base leading-6">{label}</b>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconColors[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <strong className="mt-5 block whitespace-nowrap text-2xl font-black tracking-tight">
        {formatMoney(amount)}
      </strong>
      <span className="mt-2 inline-flex rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold">
        {count} {count === 1 ? "شيك" : "شيكات"}
      </span>
    </article>
  );
}
function AccountFigure({ label, value, detail, tone = "stone" }: { label: string; value: string; detail: string; tone?: "stone" | "red" | "blue" }) {
  const colors = { stone: "border-stone-200 bg-stone-50/70 text-brand", red: "border-red-100 bg-red-50/70 text-red-800", blue: "border-blue-100 bg-blue-50/70 text-blue-800" };
  return <article className={`rounded-2xl border p-4 ${colors[tone]}`}><span className="text-sm font-bold opacity-75">{label}</span><strong className="mt-2 block text-2xl font-black">{formatMoney(value)}</strong><span className="mt-2 block text-xs opacity-60">{detail}</span></article>;
}
function TypeSales({ label, sales }: { label: string; sales: string }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-4">
      <span className="text-sm font-bold text-stone-500">{label}</span>
      <strong className="mt-3 block text-2xl font-black text-brand">{formatMoney(sales)}</strong>
    </div>
  );
}
function OrderTypeDistribution({ retail, wholesale, storeSale }: { retail: number; wholesale: number; storeSale: number }) {
  const total = retail + wholesale + storeSale;
  const percent = (value: number) => total ? (value / total) * 100 : 0;
  const rows = [
    { label: "أونلاين", value: retail, color: "bg-blue-500" },
    { label: "جملة", value: wholesale, color: "bg-emerald-500" },
    { label: "بيع محل", value: storeSale, color: "bg-amber-500" },
  ];
  return <div className="mt-4"><div className="flex items-center justify-between gap-3"><strong className="text-xl text-brand">{total} طلب</strong><span className="text-xs text-stone-400">ضمن الفترة المحددة</span></div><div className="mt-3 flex h-3 overflow-hidden rounded-full bg-stone-100" aria-label="توزيع الطلبات حسب النوع">{rows.map((row) => row.value > 0 && <span key={row.label} className={row.color} style={{ width: `${percent(row.value)}%` }}/>)}</div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">{rows.map((row) => <div key={row.label} className="rounded-lg bg-stone-50 px-3 py-2"><span className="flex items-center gap-2 text-stone-600"><i className={`h-2.5 w-2.5 rounded-full ${row.color}`}/>{row.label}</span><div className="mt-2 flex items-end justify-between"><b className="text-base text-brand">{row.value} طلب</b><span className="text-stone-400">{percent(row.value).toFixed(0)}%</span></div></div>)}</div></div>;
}
function AlertCount({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <Icon className="h-5 w-5 text-amber-700" />
      <strong className="mt-2 block text-xl text-brand">{value}</strong>
      <span className="text-xs font-bold text-stone-500">{label}</span>
    </div>
  );
}
function orderTypeLabel(type: string) {
  return type === "Retail" ? "أونلاين" : type === "Wholesale" ? "جملة" : "بيع محل";
}
function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
