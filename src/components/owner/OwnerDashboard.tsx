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
import { accountAmountColor } from '@/components/finance/accountUiUtils';

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
  const [dateError, setDateError] = useState("");
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
      setDateError("تاريخ البداية يجب أن يسبق تاريخ النهاية.");
      return;
    }
    setDateError("");
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
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6" dir="rtl">
      <header className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-black text-brand">لوحة التحكم</h1>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          ملخص المبيعات والتحصيلات والأرصدة وتنبيهات المخزون والشيكات
        </p>
      </header>
      <form
        onSubmit={apply}
        aria-label="تصفية الفترة"
        className="grid items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
      >
        <RepDateInput
          label="من تاريخ"
          value={draftFrom}
          onChange={(value) => { setDraftFrom(value); setDateError(""); }}
          max={draftTo || undefined}
        />
        <RepDateInput
          label="إلى تاريخ"
          value={draftTo}
          onChange={(value) => { setDraftTo(value); setDateError(""); }}
          min={draftFrom || undefined}
        />
        <button disabled={loading} className="btn-primary min-h-11">تطبيق الفترة</button>
        <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={query.range === "all_time"}
          className="btn-outline min-h-11 aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand"
          onClick={() => {
            setDateError("");
            setDraftFrom("");
            setDraftTo("");
            setQuery({ range: "all_time" });
          }}
        >
          كل الفترات
        </button>
        <button
          type="button"
          aria-pressed={!query.date_from && !query.date_to && query.range !== "all_time"}
          className="btn-outline min-h-11 aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand"
          onClick={() => {
            setDateError("");
            setDraftFrom("");
            setDraftTo("");
            setQuery({});
          }}
        >
          الشهر الحالي
        </button>
        </div>
        {dateError && <p role="alert" className="text-sm font-bold text-red-700 sm:col-span-2 lg:col-span-4">{dateError}</p>}
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
      {loading && !data && (
        <div role="status" aria-label="جارٍ تحميل لوحة التحكم" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      {data && (
        <div aria-busy={loading} className="space-y-5">
          {loading && <p role="status" className="text-sm text-stone-600">جارٍ تحديث البيانات…</p>}
          {error && <p role="status" className="text-sm text-amber-800">البيانات المعروضة من آخر تحميل ناجح.</p>}
          <section aria-label="الملخص المالي">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-brand">الملخص المالي</h2>
                <p className="mt-1 text-xs text-stone-600">
                  الفترة: <bdi dir="ltr">{formatOrderDate(data.period.date_from)} — {formatOrderDate(data.period.date_to)}</bdi>
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
                signed
                value={data.financial.net_sales_base}
                hint="للفترة المختارة"
                icon={TrendingUp}
              />
              <Metric
                label="صافي التحصيلات"
                signed
                value={data.financial.net_collections_base}
                hint="للفترة المختارة"
                icon={Banknote}
              />
              <Metric
                label="المبالغ المستحقة لنا"
                value={data.financial.account_debit_balances_base}
                balanceSide="debit"
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
                <bdi dir="ltr" className={'font-bold tabular-nums ' + accountAmountColor(data.financial.account_credit_balances_base, 'credit')}>{formatMoney(data.financial.account_credit_balances_base)}</bdi>
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
                    className="input mt-1 min-h-11 tabular-nums"
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
          <nav aria-label="روابط سريعة" className="grid grid-cols-2 gap-2 border-t border-stone-200 pt-4 sm:flex sm:flex-wrap">
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
        </div>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
  icon: Icon,
  cumulative = false,
  balanceSide,
  signed = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  cumulative?: boolean;
  balanceSide?: 'debit' | 'credit';
  signed?: boolean;
}) {
  const amountColor = balanceSide
    ? accountAmountColor(value, balanceSide)
    : signed
      ? accountAmountColor(value, Number(value) < 0 ? 'debit' : 'credit')
      : 'text-brand';
  return (
    <article className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex min-h-10 items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold leading-5 text-stone-600">
            {label}
          </span>
          {cumulative && <CumulativeBadge />}
        </div>
        <Icon className="h-5 w-5 shrink-0 text-gold-dark" />
      </div>
      <bdi dir="ltr" className={'mt-2 block break-words text-right text-2xl font-bold tabular-nums sm:text-3xl ' + amountColor}>
        {signed ? `${formatMoney(value).replace(/^₪/, '')} ₪` : formatMoney(value)}
      </bdi>
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
