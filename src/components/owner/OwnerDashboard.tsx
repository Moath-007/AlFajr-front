import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
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
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/rep/RepOrderUi";
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
    [appliedFrom, appliedStockThreshold, appliedTo],
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
  };
  const resetDates = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
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
    <div className="space-y-6 pb-12">
      <header className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black text-gold-dark">نظرة تشغيلية</p>
          <h1 className="mt-1 text-3xl font-black text-brand">لوحة التحكم</h1>
          <p className="mt-2 text-sm text-stone-500">
            ملخص مباشر للمبيعات والطلبات والمستحقات والمخزون.
          </p>
        </div>
        {data?.date_semantics?.timezone && (
          <span className="text-xs font-bold text-stone-400">
            التوقيت: {data.date_semantics.timezone}
          </span>
        )}
      </header>
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[220px_220px_auto_auto_1fr]">
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
            className="min-h-11 rounded-xl bg-brand px-5 text-sm font-black text-white"
          >
            تطبيق
          </button>
          {(dateFrom || dateTo || appliedFrom || appliedTo) && (
            <button
              onClick={resetDates}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold text-stone-600"
            >
              <RotateCcw className="h-4 w-4" /> الفترة الافتراضية
            </button>
          )}
          <p className="text-xs text-stone-400 lg:text-left">
            الافتراضي: الشهر الحالي حتى اليوم.
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
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric
                icon={TrendingUp}
                label="إجمالي المبيعات"
                value={formatMoney(data.summary.completed_sales_total)}
                tone="green"
              />
              <Metric
                icon={CheckCircle2}
                label="الطلبات المكتملة"
                value={data.summary.completed_orders_count}
              />
              <Metric
                icon={Clock3}
                label="الطلبات المعلقة"
                value={data.summary.pending_orders_count}
                tone="amber"
              />
              <Metric
                icon={AlertTriangle}
                label="إجمالي المستحقات"
                value={formatMoney(data.summary.outstanding_amount)}
                tone="red"
              />
              <Metric
                icon={ClipboardList}
                label="الطلبات المستحقة"
                value={data.summary.outstanding_orders_count}
                tone="red"
              />
            </section>
            <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
              <section className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="font-black text-brand">الطلبات حسب النوع</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <TypeCount label="أونلاين" value={data.orders_by_type.retail} />
                  <TypeCount
                    label="جملة"
                    value={data.orders_by_type.wholesale}
                  />
                  <TypeCount
                    label="بيع محل"
                    value={data.orders_by_type.store_sale}
                  />
                </div>
              </section>
              <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
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
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
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
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-stone-50 text-stone-500">
                        <tr>
                          {[
                            "الطلب",
                            "العميل",
                            "النوع",
                            "الحالة",
                            "الدفع",
                            "الإجمالي",
                            "المتبقي",
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
                            <td className="px-4">
                              <PaymentStatusBadge
                                status={order.payment_status}
                              />
                            </td>
                            <td className="px-4 font-bold">
                              {formatMoney(order.total_amount)}
                            </td>
                            <td className="px-4 text-red-700">
                              {formatMoney(order.remaining_amount)}
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
                          <PaymentStatusBadge status={order.payment_status} />
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold">
                            {orderTypeLabel(order.order_type)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>
                            الإجمالي: <b>{formatMoney(order.total_amount)}</b>
                          </span>
                          <span className="text-red-700">
                            المتبقي:{" "}
                            <b>{formatMoney(order.remaining_amount)}</b>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </section>
            <section className="rounded-2xl border bg-white shadow-sm">
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
  tone = "brand",
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  const colors = {
    brand: "bg-brand-50 text-brand",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <strong className="mt-4 block text-2xl text-brand">{value}</strong>
      <span className="mt-1 block text-sm font-bold text-stone-500">
        {label}
      </span>
    </article>
  );
}
function TypeCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-50 p-4">
      <span className="text-sm font-bold text-stone-500">{label}</span>
      <strong className="mt-2 block text-2xl text-brand">{value}</strong>
    </div>
  );
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
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
