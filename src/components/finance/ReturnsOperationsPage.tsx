import { useCallback, useEffect, useState } from "react";
import {
  returnsService,
  type SalesReturnDto,
  type ReturnVariant,
  type PurchaseReturnDto,
} from "@/api";
import { useAuth } from "@/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { apiMessages } from "@/components/rep/repOrderUtils";
import { formatMoney } from "@/utils/money";
import SalesReturnEditor from "./SalesReturnEditor";
import AccountReturnLauncher from "./AccountReturnLauncher";

type Action = "cancel" | "restore" | "delete";
export default function ReturnsOperationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SalesReturnDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [accounts, setAccounts] = useState<
    Array<{ account_id: number; name: string }>
  >([]);
  const [variants, setVariants] = useState<ReturnVariant[]>([]);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(0);
  const [status, setStatus] = useState<"" | "Completed" | "Cancelled">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SalesReturnDto | null>(null);
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<SalesReturnDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseReturnDto[]>([]);
  const [purchaseCancel, setPurchaseCancel] = useState<number | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const r = await returnsService.list(
          {
            page,
            limit: 20,
            search,
            account_id: account || undefined,
            status: status || undefined,
            date_from: from || undefined,
            date_to: to || undefined,
          },
          signal,
        );
        if (signal?.aborted) return;
        setRows(r.items);
        setTotal(r.pagination.total);
        setPages(r.pagination.total_pages);
        setError("");
      } catch (e) {
        if (!signal?.aborted)
          setError(apiMessages(e, "تعذر تحميل المردودات.").join("، "));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, search, account, status, from, to],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      returnsService.accounts(c.signal),
      returnsService.variants(c.signal),
      returnsService.listPurchase(),
    ])
      .then(([a, v, p]) => {
        if (!c.signal.aborted) {
          setAccounts(a);
          setVariants(v);
          setPurchaseRows(p);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(apiMessages(e, "تعذر تحميل الحسابات والأصناف.").join("، "));
      });
    return () => c.abort();
  }, []);
  const details = async (id: number) => {
    try {
      setSelected(await returnsService.details(id));
      setNote("");
    } catch (e) {
      setError(apiMessages(e, "تعذر فتح المردود.").join("، "));
    }
  };
  const mutate = async () => {
    if (!selected || !action || saving) return;
    setSaving(true);
    try {
      if (action === "delete") {
        await returnsService.permanentDelete(selected.customer_return_id);
        setSelected(null);
      } else {
        if (action === "cancel")
          await returnsService.cancel(
            selected.customer_return_id,
            note || undefined,
          );
        else
          await returnsService.restore(
            selected.customer_return_id,
            note || undefined,
          );
        await details(selected.customer_return_id);
      }
      setAction(null);
      await load();
    } catch (e) {
      setError(apiMessages(e, "تعذر تنفيذ العملية.").join("، "));
      setAction(null);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div dir="rtl" className="space-y-5">
      <header className="flex flex-wrap justify-between gap-3">
        <h1 className="text-3xl font-black text-brand">مردودات البيع</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setEditor(true);
          }}
          disabled={!accounts.length || !variants.length}
        >
          إنشاء مردود بيع
        </button>
      </header>
      {error && (
        <p role="alert" className="rep-error">
          {error}
        </p>
      )}
      {selected ? (
        <section className="space-y-4 rounded-2xl border p-4">
          <button className="btn-outline" onClick={() => setSelected(null)}>
            العودة للقائمة
          </button>
          <h2 className="text-2xl font-bold">{selected.return_number}</h2>
          <p>
            {selected.return_date.slice(0, 10)} · {selected.account.name} ·{" "}
            {selected.status === "Completed" ? "مكتمل" : "ملغى"} ·{" "}
            {formatMoney(selected.total_amount)} ₪
          </p>
          <p>{selected.notes}</p>
          <div className="space-y-2">
            {selected.items.map((i) => (
              <div
                key={i.customer_return_item_id}
                className="rounded border p-3"
              >
                {i.product_variants.products.name} ·{" "}
                {i.product_variants.colors.name} · {i.product_variants.size} —{" "}
                {i.quantity} × {formatMoney(i.unit_price)} ₪ ={" "}
                {formatMoney(i.quantity * Number(i.unit_price))} ₪
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.status === "Completed" ? (
              <>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setEditing(selected);
                    setEditor(true);
                  }}
                >
                  تعديل
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setAction("cancel")}
                >
                  إلغاء المردود
                </button>
              </>
            ) : (
              <button
                className="btn-outline"
                onClick={() => setAction("restore")}
              >
                استعادة المردود
              </button>
            )}
            <button
              className="btn-outline text-red-700"
              onClick={() => setAction("delete")}
            >
              حذف نهائي
            </button>
          </div>
          <label className="block">
            ملاحظة الإلغاء أو الاستعادة (اختيارية)
            <input
              className="rep-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <h3 className="text-lg font-bold">تاريخ المردود</h3>
          {selected.history?.map((h) => (
            <details className="rounded border p-3" key={h.audit_log_id}>
              <summary>
                {(
                  {
                    Created: "إنشاء",
                    Edited: "تعديل",
                    Cancelled: "إلغاء",
                    Restored: "استعادة",
                  } as Record<string, string>
                )[h.action] ?? h.action}{" "}
                · {h.users?.name ?? "النظام"} ·{" "}
                {new Date(h.created_at).toLocaleString("ar-EG")}
              </summary>
              <div className="grid gap-3 sm:grid-cols-2">
                {!!h.before_data && (
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                    قبل:{" "}
                    {JSON.stringify(
                      h.before_data,
                      (key, value: unknown) =>
                        key === "layers" ? undefined : value,
                      2,
                    )}
                  </pre>
                )}
                {!!h.after_data && (
                  <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                    بعد:{" "}
                    {JSON.stringify(
                      h.after_data,
                      (key, value: unknown) =>
                        key === "layers" ? undefined : value,
                      2,
                    )}
                  </pre>
                )}
              </div>
            </details>
          ))}
        </section>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <input
              className="rep-control"
              aria-label="بحث"
              placeholder="رقم المردود أو الحساب"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="rep-control"
              aria-label="حساب"
              value={account}
              onChange={(e) => {
                setAccount(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={0}>كل الحسابات</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              className="rep-control"
              aria-label="الحالة"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
            >
              <option value="">كل الحالات</option>
              <option value="Completed">مكتمل</option>
              <option value="Cancelled">ملغى</option>
            </select>
            <label>
              من
              <input
                type="date"
                className="rep-control"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              إلى
              <input
                type="date"
                className="rep-control"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <p>{loading ? "جارٍ التحميل…" : `${total} مردود`}</p>
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.customer_return_id}
                className="flex w-full flex-wrap justify-between gap-3 rounded-xl border bg-white p-4 text-right"
                onClick={() => void details(r.customer_return_id)}
              >
                <b>{r.return_number}</b>
                <span>{r.return_date.slice(0, 10)}</span>
                <span>{r.account.name}</span>
                <span>{r.created_by_user.name}</span>
                <span>{r.status === "Completed" ? "مكتمل" : "ملغى"}</span>
                <b>{formatMoney(r.total_amount)} ₪</b>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              className="btn-outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              السابق
            </button>
            <span>
              {page} / {pages || 1}
            </span>
            <button
              className="btn-outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
      <details className="rounded-xl border p-3">
        <summary>مردودات الشراء — مسار مستقل</summary>
        {user?.role === "Admin" && (
          <button className="btn-outline" onClick={() => setPurchaseOpen(true)}>
            إنشاء مردود شراء
          </button>
        )}
        {purchaseRows.map((r) => (
          <div
            className="flex justify-between gap-2 border-b py-2"
            key={r.customer_return_id}
          >
            <span>
              #{r.customer_return_id} ·{" "}
              {r.account?.name ?? `جهة #${r.customer_id}`} ·{" "}
              {formatMoney(r.total_amount)} ₪ ·{" "}
              {r.cancelled_at ? "ملغى" : "فعال"}
            </span>
            {user?.role === "Admin" && !r.cancelled_at && (
              <button onClick={() => setPurchaseCancel(r.customer_return_id)}>
                إلغاء
              </button>
            )}
          </div>
        ))}
      </details>
      {editor && (
        <SalesReturnEditor
          key={editing?.customer_return_id ?? "new"}
          document={editing}
          accounts={accounts}
          variants={variants}
          onClose={() => setEditor(false)}
          onSaved={(id) => {
            setEditor(false);
            void load();
            void details(id);
          }}
        />
      )}
      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={() => void mutate()}
        loading={saving}
        title="تأكيد العملية"
        message={`تأكيد ${action === "cancel" ? "إلغاء" : action === "restore" ? "استعادة" : "الحذف النهائي لـ"} ${selected?.return_number ?? ""} وآثاره المالية والمخزنية؟`}
      />
      <AccountReturnLauncher
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        onSaved={() => {
          setPurchaseOpen(false);
          void returnsService.listPurchase().then(setPurchaseRows);
        }}
      />
      <ConfirmDialog
        open={purchaseCancel !== null}
        onClose={() => setPurchaseCancel(null)}
        onConfirm={() => {
          if (purchaseCancel !== null) {
            setSaving(true);
            void returnsService
              .cancelPurchase(purchaseCancel)
              .then(() => {
                setPurchaseCancel(null);
                return returnsService.listPurchase();
              })
              .then(setPurchaseRows)
              .catch((e) =>
                setError(apiMessages(e, "تعذر إلغاء مردود الشراء.").join("، ")),
              )
              .finally(() => setSaving(false));
          }
        }}
        loading={saving}
        title="إلغاء مردود الشراء"
        message="تأكيد عكس أثر مردود الشراء المالي والمخزني؟"
      />
    </div>
  );
}
