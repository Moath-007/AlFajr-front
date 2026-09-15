import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { notificationsService, type NotificationDto } from "@/api";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";

export default function AdminNotificationBell({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const countRequest = useRef<Promise<void> | null>(null);

  const loadCount = useCallback(() => {
    if (countRequest.current) return countRequest.current;
    const request = notificationsService
      .unreadCount()
      .then((result) => setCount(result.unread_count))
      .catch(() => undefined)
      .finally(() => {
        countRequest.current = null;
      });
    countRequest.current = request;
    return request;
  }, []);
  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    try {
      const result = await notificationsService.list({ page: 1, limit: 20 });
      setItems(result.notifications);
    } catch (error) {
      setErrors(apiMessages(error, "تعذر تحميل الإشعارات."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadCount();
    const timer = window.setInterval(() => void loadCount(), 45_000);
    const focus = () => void loadCount();
    window.addEventListener("focus", focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [loadCount]);
  useEffect(() => {
    if (open) void loadItems();
  }, [loadItems, open]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("mousedown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("mousedown", outside);
    };
  }, [open]);
  const openNotification = async (item: NotificationDto) => {
    if (!item.is_read) {
      try {
        await notificationsService.markRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, is_read: true } : entry,
          ),
        );
        setCount((current) => Math.max(0, current - 1));
      } catch (error) {
        setErrors(apiMessages(error, "تعذر تعليم الإشعار كمقروء."));
        return;
      }
    }
    setOpen(false);
    onNavigate(`/owner/orders/${item.order_id}`);
  };
  const readAll = async () => {
    try {
      await notificationsService.markAllRead();
      setItems((current) =>
        current.map((item) => ({ ...item, is_read: true })),
      );
      setCount(0);
    } catch (error) {
      setErrors(apiMessages(error, "تعذر تعليم الإشعارات كمقروءة."));
    }
  };
  return (
    <div ref={rootRef} className="fixed left-4 top-4 z-40 print:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={count ? `الإشعارات، ${count} غير مقروء` : "الإشعارات"}
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-stone-200 bg-white text-brand shadow-md transition hover:border-gold hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-black leading-5 text-white">
            <span className="sr-only">غير مقروء: </span>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <section
          aria-label="لوحة الإشعارات"
          className="absolute left-0 mt-2 flex max-h-[min(70vh,560px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-black text-brand">الإشعارات</h2>
              <p className="text-xs text-stone-500">أحدث الطلبات والدفعات</p>
            </div>
            {items.some((item) => !item.is_read) && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="inline-flex items-center gap-1 text-xs font-black text-gold-dark"
              >
                <CheckCheck className="h-4 w-4" /> تحديد الكل كمقروء
              </button>
            )}
          </header>
          <div className="overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-stone-500">
                جاري تحميل الإشعارات…
              </p>
            ) : errors.length ? (
              <div
                role="alert"
                className="m-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
              >
                <p>{errors.join("، ")}</p>
                <button
                  type="button"
                  onClick={() => void loadItems()}
                  className="mt-2 inline-flex items-center gap-1 underline"
                >
                  <RefreshCw className="h-4 w-4" /> إعادة المحاولة
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-sm text-stone-500">
                لا توجد إشعارات.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b p-4 text-right transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold ${item.is_read ? "bg-white" : "bg-amber-50/60"}`}
                >
                  <span className="block text-sm font-bold text-stone-800">
                    {item.message}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span
                      className={`rounded-full px-2 py-0.5 font-black ${item.type === "OrderCreated" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {item.type === "OrderCreated"
                        ? "طلب جديد"
                        : "دفعة مستلمة"}
                    </span>
                    <b className="text-gold-dark">
                      {item.type === "OrderCreated" ? "الإجمالي: " : "الدفعة: "}
                      {formatMoney(item.amount)}
                    </b>
                    {item.payment_method && (
                      <span>
                        {item.payment_method === "Cash" ? "نقدًا" : "شيك"}
                      </span>
                    )}
                    <span>الطلب #{item.order_id}</span>
                    <span>
                      {item.customer.name} · {item.customer.phone}
                    </span>
                    <span>
                      {item.representative
                        ? `المندوب: ${item.representative.name}`
                        : "طلب عبر الموقع"}
                    </span>
                  </span>
                  <time className="mt-1 block text-[11px] text-stone-400">
                    {formatOrderDate(item.created_at)}
                  </time>
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
