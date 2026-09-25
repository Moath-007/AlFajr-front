import { useEffect, useState, type FormEvent } from "react";
import { Eye, Pencil, Plus } from "lucide-react";
import {
  ordersService,
  type ApiOrderStatus,
  type OrderListItemResponseDto,
} from "@/api";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RepDateInput, RepSearchField, RepSelect } from "./RepFormControls";
import { OrderStatusBadge } from "./RepOrderUi";
import { apiMessages, formatMoney, formatOrderDate } from "./repOrderUtils";

export default function RepOrders({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [orders, setOrders] = useState<OrderListItemResponseDto[]>([]),
    [loading, setLoading] = useState(true),
    [errors, setErrors] = useState<string[]>([]),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1),
    [search, setSearch] = useState(""),
    [submitted, setSubmitted] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setErrors([]);
    ordersService
      .list(
        {
          page,
          limit: 10,
          order_type: "Wholesale",
          search: submitted || undefined,
          status: (status as ApiOrderStatus) || undefined,
          date_from: from || undefined,
          date_to: to || undefined,
          sort_by: "created_at",
          sort_order: "desc",
        },
        c.signal,
      )
      .then((r) => {
        setOrders(r.orders);
        setPages(r.pagination.total_pages || 1);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setErrors(apiMessages(e, "تعذر تحميل طلبات الجملة."));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [from, page, status, submitted, to]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmitted(search.trim());
  };
  return (
    <div className="space-y-6">
      <header className="rep-page-header">
        <div>
          <p className="rep-eyebrow">سجل المبيعات المشترك</p>
          <h1 className="rep-title">كل طلبات الجملة</h1>
          <p className="rep-subtitle">
            عرض وتعديل وإلغاء طلبات الجملة لجميع المناديب.
          </p>
        </div>
        <button
          onClick={() => onNavigate("/rep/products")}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> إنشاء طلب جديد
        </button>
      </header>
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5"
      >
        <RepSearchField label="البحث" value={search} onChange={setSearch} />
        <RepSelect
          label="حالة الطلب"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "الكل" },
            { value: "Pending", label: "قيد الانتظار" },
            { value: "Completed", label: "مكتمل" },
            { value: "Cancelled", label: "ملغي" },
          ]}
        />
        <RepDateInput label="من" value={from} onChange={setFrom} />
        <RepDateInput label="إلى" value={to} onChange={setTo} />
        <button className="btn-primary self-end">بحث</button>
      </form>
      {errors.length > 0 && (
        <div className="rep-error">{errors.join("، ")}</div>
      )}
      {loading ? (
        <Skeleton className="h-80" />
      ) : orders.length === 0 ? (
        <EmptyState title="لا توجد طلبات مطابقة" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-white shadow-sm lg:block">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  {[
                    "الطلب",
                    "الزبون",
                    "المندوب",
                    "الحالة",
                    "الإجمالي",
                    "التاريخ",
                    "الإجراءات",
                  ].map((label) => (
                    <th key={label} className="whitespace-nowrap px-4 py-3 text-right">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const canEdit = order.status !== "Cancelled";
                  return (
                    <tr key={order.id} className="transition hover:bg-stone-50/70">
                      <td className="px-4 py-4 font-black text-brand">#{order.id}</td>
                      <td className="px-4 py-4">
                        <b className="block">{order.customer.name}</b>
                        <small className="text-stone-400">{order.customer.phone}</small>
                      </td>
                      <td className="px-4 py-4">{order.representative?.name || "—"}</td>
                      <td className="px-4 py-4"><OrderStatusBadge status={order.status} /></td>
                      <td className="whitespace-nowrap px-4 py-4 font-black text-brand">{formatMoney(order.total_amount)}</td>
                      <td className="whitespace-nowrap px-4 py-4">{formatOrderDate(order.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => onNavigate(`/rep/orders/${order.id}`)} className="rounded-lg bg-brand-50 p-2 text-brand" aria-label={`عرض الطلب ${order.id}`} title="التفاصيل"><Eye className="h-4 w-4" /></button>
                          {canEdit && <button onClick={() => onNavigate(`/rep/orders/${order.id}/edit`)} className="rounded-lg bg-gold/15 p-2 text-gold-dark" aria-label={`تعديل الطلب ${order.id}`} title="تعديل"><Pencil className="h-4 w-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {orders.map((order) => {
              const canEdit = order.status !== "Cancelled";
              return <article key={order.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><b className="text-brand">طلب #{order.id}</b><p className="mt-1 text-sm font-bold">{order.customer.name}</p></div><OrderStatusBadge status={order.status} /></div>
                <p className="mt-2 text-xs text-stone-500">{order.representative?.name || "بدون مندوب"} · {formatOrderDate(order.created_at)}</p>
                <b className="mt-3 block border-y py-3 text-brand">{formatMoney(order.total_amount)}</b>
                <div className="mt-3 flex gap-2"><button className="btn-outline flex-1" onClick={() => onNavigate(`/rep/orders/${order.id}`)}>التفاصيل</button>{canEdit && <button className="btn-primary flex-1" onClick={() => onNavigate(`/rep/orders/${order.id}/edit`)}>تعديل</button>}</div>
              </article>;
            })}
          </div>
        </>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-3">
          <button
            className="btn-outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            السابق
          </button>
          <span className="rounded-lg bg-white px-4 py-2 text-sm font-bold">
            {page} / {pages}
          </span>
          <button
            className="btn-outline"
            disabled={page === pages}
            onClick={() => setPage(page + 1)}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
