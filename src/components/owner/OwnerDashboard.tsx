import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Banknote,
  Boxes,
  ClipboardList,
  FileText,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { dashboardService, type AdminDashboardResponseDto } from "@/api";
import { RepDateInput } from "@/components/rep/RepFormControls";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";

const quickLinks = [
  { path: "orders", label: "الطلبات", icon: ClipboardList },
  { path: "vouchers", label: "سندات القبض والصرف والقيد", icon: FileText },
  { path: "accounts", label: "الحسابات", icon: Users },
  { path: "checks", label: "الشيكات", icon: Banknote },
  { path: "inventory", label: "المخزون", icon: Boxes },
];

const STOCK_THRESHOLD_KEY = "alfajr_owner_stock_alert_threshold";
function savedStockThreshold() {
  try {
    const stored = localStorage.getItem(STOCK_THRESHOLD_KEY);
    if (stored === null || !stored.trim()) return 5;
    const value = Number(stored);
    return Number.isInteger(value) && value >= 0 && value <= 2147483647
      ? value
      : 5;
  } catch {
    return 5;
  }
}

export default function OwnerDashboard({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const [data, setData] = useState<AdminDashboardResponseDto | null>(null);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [query, setQuery] = useState<{
    date_from?: string;
    date_to?: string;
    range?: "current_month" | "all_time";
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [stockThreshold, setStockThreshold] = useState(savedStockThreshold);
  const [draftThreshold, setDraftThreshold] = useState(() =>
    String(stockThreshold),
  );
  const [thresholdError, setThresholdError] = useState("");
  const load = useCallback(
    (signal: AbortSignal) => {
      setLoading(true);
      setError("");
      dashboardService
        .get({ ...query, stock_threshold: stockThreshold }, signal)
        .then((result) => {
          if (!signal.aborted) setData(result);
        })
        .catch((reason) => {
          if (!signal.aborted)
            setError(apiMessages(reason, "تعذر تحميل لوحة التحكم.").join("، "));
        })
        .finally(() => {
          if (!signal.aborted) setLoading(false);
        });
    },
    [query, stockThreshold],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);
  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (draftFrom && draftTo && draftFrom > draftTo) {
      setError("تاريخ البداية يجب أن يسبق تاريخ النهاية.");
      return;
    }
    setQuery({
      date_from: draftFrom || undefined,
      date_to: draftTo || undefined,
      range: "current_month",
    });
  };
  const applyThreshold = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(draftThreshold);
    if (
      !draftThreshold.trim() ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 2147483647
    ) {
      setThresholdError("أدخل عددًا صحيحًا من 0 إلى 2147483647");
      return;
    }
    setThresholdError("");
    setStockThreshold(value);
    try {
      localStorage.setItem(STOCK_THRESHOLD_KEY, String(value));
    } catch {
      /* The selected threshold still works when browser storage is unavailable. */
    }
  };
  return (
    <main className="mx-auto max-w-[1500px] space-y-6 pb-10" dir="rtl">
      <header className="rounded-3xl bg-brand px-5 py-6 text-white sm:px-8">
        <h1 className="text-3xl font-black">لوحة التحكم</h1>
        <p className="mt-2 text-sm text-white/80">
          ملخص المبيعات والتحصيلات والأرصدة وتنبيهات المخزون والشيكات
        </p>
      </header>
      <form
        onSubmit={apply}
        className="grid items-end gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]"
      >
        <RepDateInput
          label="من تاريخ"
          value={draftFrom}
          onChange={setDraftFrom}
          max={draftTo || undefined}
        />
        <RepDateInput
          label="إلى تاريخ"
          value={draftTo}
          onChange={setDraftTo}
          min={draftFrom || undefined}
        />
        <button className="btn-primary min-h-11">تطبيق</button>
        <button
          type="button"
          className="btn-outline min-h-11"
          onClick={() => {
            setDraftFrom("");
            setDraftTo("");
            setQuery({ range: "all_time" });
          }}
        >
          كل الفترات
        </button>
        <button
          type="button"
          className="btn-outline min-h-11"
          onClick={() => {
            setDraftFrom("");
            setDraftTo("");
            setQuery({});
          }}
        >
          الشهر الحالي
        </button>
      </form>
      {error && (
        <div className="rep-error" role="alert">
          {error}{" "}
          <button
            className="font-bold underline"
            onClick={() => setRevision((n) => n + 1)}
          >
            إعادة المحاولة <RefreshCw className="inline h-4 w-4" />
          </button>
        </div>
      )}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      {data && (
        <>
          <section aria-label="الملخص المالي">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-brand">الملخص المالي</h2>
                <p className="mt-1 text-xs text-stone-600">
                  الفترة: {formatOrderDate(data.period.date_from)} —{" "}
                  {formatOrderDate(data.period.date_to)}
                </p>
              </div>
              <button
                className="text-sm font-bold text-gold-dark"
                onClick={() => onNavigate("reports")}
              >
                عرض التقارير ←
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="صافي المبيعات"
                value={data.financial.net_sales_base}
                hint="للفترة المختارة"
                icon={TrendingUp}
              />
              <Metric
                label="صافي التحصيلات"
                value={data.financial.net_collections_base}
                hint="للفترة المختارة"
                icon={Banknote}
              />
              <Metric
                label="المبالغ المستحقة لنا"
                value={data.financial.account_debit_balances_base}
                hint="أرصدة الحسابات المدينة الحالية"
                cumulative
                icon={Users}
              />
              <Metric
                label="رصيد الخزينة"
                value={data.financial.treasury_base_balance}
                hint="الصناديق والبنوك والشيكات برسم التحصيل حاليًا"
                cumulative
                icon={Banknote}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
              <span>
                المبالغ بالعملة الأساسية · فلتر الفترة يخص المبيعات والتحصيلات
                فقط
              </span>
              <span>
                المبالغ المستحقة علينا (أرصدة دائنة):{" "}
                {formatMoney(data.financial.account_credit_balances_base)}
                <span className="mr-2">
                  <CumulativeBadge />
                </span>
              </span>
            </div>
          </section>
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="min-w-0 rounded-2xl border bg-white p-5">
              <h2 className="font-black text-brand">حالات الطلبات</h2>
              <p className="mt-1 text-xs text-stone-500">
                عدد الطلبات حسب حالتها الحالية، لجميع الفترات
              </p>
              {data.orders.completed +
                data.orders.pending +
                data.orders.cancelled >
              0 ? (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["مكتملة", data.orders.completed],
                    ["معلقة", data.orders.pending],
                    ["ملغاة", data.orders.cancelled],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 p-3">
                      <b className="block text-xl">{value}</b>
                      <span className="text-xs">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="لا توجد طلبات حتى الآن" />
              )}
              {data.orders.pending_online > 0 && (
                <button
                  className="mt-3 w-full rounded-xl bg-amber-50 p-3 text-right text-sm font-bold text-amber-900"
                  onClick={() => onNavigate("orders")}
                >
                  {data.orders.pending_online} طلب من المتجر الإلكتروني بانتظار
                  التأكيد ←
                </button>
              )}
              <button
                className="mt-3 text-sm font-bold text-gold-dark"
                onClick={() => onNavigate("orders")}
              >
                عرض الطلبات ←
              </button>
            </section>
            <section className="min-w-0 rounded-2xl border bg-white p-5">
              <h2 className="font-black text-brand">تنبيهات المخزون</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                الأصناف التي كميتها منخفضة أو صفر أو سالبة. حد المخزون المنخفض:{" "}
                {data.stock_alerts.low_threshold}
              </p>
              <form
                onSubmit={applyThreshold}
                className="mt-3 flex items-end gap-2"
              >
                <label
                  className="w-24 shrink-0 text-xs font-bold text-stone-600"
                  htmlFor="stock-alert-threshold"
                >
                  حد المخزون المنخفض
                  <input
                    id="stock-alert-threshold"
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={draftThreshold}
                    onChange={(event) => {
                      setDraftThreshold(event.target.value);
                      setThresholdError("");
                    }}
                    aria-invalid={!!thresholdError}
                    aria-describedby={
                      thresholdError ? "stock-threshold-error" : undefined
                    }
                    className="mt-1 block min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-brand"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-outline min-h-11 shrink-0 disabled:opacity-50"
                >
                  تطبيق الحد
                </button>
              </form>
              {thresholdError && (
                <p
                  id="stock-threshold-error"
                  role="alert"
                  className="mt-2 text-xs text-red-700"
                >
                  {thresholdError}
                </p>
              )}
              {data.stock_alerts.low +
                data.stock_alerts.out +
                data.stock_alerts.negative >
              0 ? (
                <>
                  <p className="mt-3 text-sm font-bold text-brand">
                    {data.stock_alerts.low +
                      data.stock_alerts.out +
                      data.stock_alerts.negative}{" "}
                    صنف بحاجة لمراجعة المخزون
                  </p>
                  <div
                    className={`mt-3 grid gap-2 text-center ${data.stock_alerts.low_threshold > 0 ? "grid-cols-3" : "grid-cols-2"}`}
                  >
                    {[
                      ...(data.stock_alerts.low_threshold > 0
                        ? [
                            [
                              `مخزون منخفض من 1 إلى ${data.stock_alerts.low_threshold}`,
                              data.stock_alerts.low,
                            ],
                          ]
                        : []),
                      ["مخزون نفد", data.stock_alerts.out],
                      ["مخزون سالب", data.stock_alerts.negative],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-stone-50 p-3">
                        <b className="block text-xl">{value}</b>
                        <span className="text-xs">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState text="لا توجد تنبيهات مخزون" />
              )}
              <button
                className="mt-3 text-sm font-bold text-gold-dark"
                onClick={() => onNavigate("reports/inventory")}
              >
                عرض تقرير المخزون ←
              </button>
            </section>
            <section className="min-w-0 rounded-2xl border bg-white p-5">
              <h2 className="font-black text-brand">تنبيهات الشيكات</h2>
              <p className="mt-1 text-xs text-stone-500">
                شيكات واردة في الخزينة أو البنك برسم التحصيل
              </p>
              {data.check_alerts.due_today + data.check_alerts.overdue > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  {[
                    ["مستحقة اليوم", data.check_alerts.due_today],
                    ["تجاوزت موعد الاستحقاق", data.check_alerts.overdue],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 p-3">
                      <b className="block text-xl">{value}</b>
                      <span className="text-xs">{label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="لا توجد شيكات مستحقة اليوم أو تجاوزت موعد الاستحقاق" />
              )}
              <button
                className="mt-3 text-sm font-bold text-gold-dark"
                onClick={() => onNavigate("reports/checks")}
              >
                عرض تقرير الشيكات ←
              </button>
            </section>
          </div>
          <nav aria-label="روابط سريعة" className="flex flex-wrap gap-2">
            {quickLinks.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                className="btn-outline inline-flex items-center gap-2"
                onClick={() => onNavigate(path)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            <button
              className="btn-primary"
              onClick={() => onNavigate("reports")}
            >
              كل التقارير ←
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
function Metric({
  label,
  value,
  hint,
  icon: Icon,
  cumulative = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  cumulative?: boolean;
}) {
  return (
    <article className="min-w-0 rounded-2xl border bg-white p-5">
      <div className="flex min-h-10 items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold leading-5 text-stone-600">
            {label}
          </span>
          {cumulative && <CumulativeBadge />}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-gold-dark" />
      </div>
      <b className="mt-3 block break-words text-3xl text-brand">
        {formatMoney(value)}
      </b>
      <p className="mt-2 text-xs leading-5 text-stone-500">{hint}</p>
    </article>
  );
}
function CumulativeBadge() {
  return (
    <span
      title="الرصيد الحالي من بداية التسجيل، ولا يتأثر بفلتر الفترة"
      className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold leading-4 text-brand"
    >
      تراكمي
    </span>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-xl bg-stone-50 px-3 py-4 text-sm leading-6 text-stone-500">
      {text}
    </p>
  );
}
