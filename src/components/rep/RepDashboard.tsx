import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import {
  ordersService,
  type OrderListItemResponseDto,
  type RepresentativeOrderStatsDto,
} from "@/api";
import { OrderStatusBadge } from "./RepOrderUi";
import { apiMessages, formatMoney, formatOrderDate } from "./repOrderUtils";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RepDashboard({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [stats, setStats] = useState<RepresentativeOrderStatsDto | null>(null),
    [recent, setRecent] = useState<OrderListItemResponseDto[]>([]);
  const [statsError, setStatsError] = useState<string[]>([]),
    [recentError, setRecentError] = useState<string[]>([]);
  const [statsLoading, setStatsLoading] = useState(true),
    [recentLoading, setRecentLoading] = useState(true);
  const loadStats = useCallback(async (signal?: AbortSignal) => {
    setStatsLoading(true);
    setStatsError([]);
    try {
      setStats((await ordersService.getMyStats(signal)).stats);
    } catch (error) {
      if (!signal?.aborted)
        setStatsError(apiMessages(error, "تعذر تحميل الإحصائيات."));
    } finally {
      if (!signal?.aborted) setStatsLoading(false);
    }
  }, []);
  const loadRecent = useCallback(async (signal?: AbortSignal) => {
    setRecentLoading(true);
    setRecentError([]);
    try {
      setRecent(
        (
          await ordersService.listMine(
            { page: 1, limit: 5, sort_by: "created_at", sort_order: "desc" },
            signal,
          )
        ).orders,
      );
    } catch (error) {
      if (!signal?.aborted)
        setRecentError(apiMessages(error, "تعذر تحميل آخر الطلبات."));
    } finally {
      if (!signal?.aborted) setRecentLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadStats(controller.signal);
    void loadRecent(controller.signal);
    return () => controller.abort();
  }, [loadRecent, loadStats]);
  const cards = stats
    ? ([
        [
          "إجمالي الطلبات",
          stats.total_orders,
          ClipboardList,
          "bg-blue-50 text-blue-700",
        ],
        [
          "قيد الانتظار",
          stats.pending_orders,
          Clock3,
          "bg-amber-50 text-amber-700",
        ],
        [
          "مكتملة",
          stats.completed_orders,
          CheckCircle2,
          "bg-emerald-50 text-emerald-700",
        ],
        ["ملغاة", stats.cancelled_orders, XCircle, "bg-red-50 text-red-700"],
      ] as const)
    : [];
  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-brand p-6 text-white shadow-lg sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-sm font-bold text-gold-light">
            إحصائياتي منذ البداية
          </p>
          <h1 className="mt-2 text-3xl font-black">لوحة تحكم المندوب</h1>
          <p className="mt-2 text-sm text-stone-300">
            إحصائيات طلباتك أنت، مع وصولك إلى سجل طلبات الجملة المشترك.
          </p>
        </div>
        <button
          onClick={() => onNavigate("/rep/products")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-black text-brand"
        >
          <ShoppingBag className="h-5 w-5" /> إنشاء طلب جملة
        </button>
      </header>
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : statsError.length ? (
        <SectionError messages={statsError} onRetry={() => void loadStats()} />
      ) : (
        stats && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(([label, value, Icon, style]) => (
              <article
                key={label}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${style}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-2xl font-black text-brand">{value}</p>
                <p className="mt-1 text-sm font-bold text-stone-500">{label}</p>
              </article>
            ))}
            <article className="rounded-2xl border border-gold/30 bg-gold/10 p-5">
              <p className="text-sm font-bold text-stone-600">
              صافي مبيعاتي المكتملة
              </p>
              <p className="mt-5 text-2xl font-black text-brand">
                {formatMoney(stats.completed_sales_total)}
              </p>
            </article>
          </section>
        )
      )}
      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <div>
                <h2 className="text-lg font-black text-brand">آخر طلباتي</h2>
                <p className="text-sm text-stone-500">آخر خمسة طلبات سجلتها</p>
          </div>
          <button
            onClick={() => onNavigate("/rep/orders")}
            className="text-sm font-black text-gold-dark"
          >
            عرض الكل
          </button>
        </div>
        {recentLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : recentError.length ? (
          <div className="p-5">
            <SectionError
              messages={recentError}
              onRetry={() => void loadRecent()}
            />
          </div>
        ) : recent.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-stone-500">
            لا توجد طلبات حتى الآن.
          </p>
        ) : (
          <div className="divide-y">
            {recent.map((order) => (
              <button
                key={order.id}
                onClick={() => onNavigate(`/rep/orders/${order.id}`)}
                className="grid w-full gap-3 p-4 text-right hover:bg-stone-50 sm:grid-cols-[90px_1fr_auto_auto] sm:items-center"
              >
                <strong className="text-brand">#{order.id}</strong>
                <span>
                  <b className="block text-sm">{order.customer.name}</b>
                  <small className="text-stone-400">
                    {formatOrderDate(order.created_at)}
                  </small>
                </span>
                <OrderStatusBadge status={order.status} />
                <strong className="text-gold-dark">
                  {formatMoney(order.total_amount)}
                </strong>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
function SectionError({
  messages,
  onRetry,
}: {
  messages: string[];
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center font-bold text-red-800">
      <p>{messages.join("، ")}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg border bg-white px-4 py-2 text-sm"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
