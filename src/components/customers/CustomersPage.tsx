import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Banknote, Edit3, Eye, Plus, Search, Users } from "lucide-react";
import {
  customersService,
  type CustomerAccountDto,
  type CustomerSelectionDto,
} from "@/api";
import {
  apiMessages,
  formatMoney,
  formatOrderDate,
} from "@/components/rep/repOrderUtils";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { StyledDatePicker } from "@/components/ui/CustomerSettlementModal";

type Filter = "all" | "due" | "credit" | "balanced";
type Sort = "balance" | "recent" | "name";

export default function CustomersPage({
  onNavigate,
  basePath,
}: {
  onNavigate: (path: string) => void;
  basePath: string;
}) {
  const [items, setItems] = useState<CustomerAccountDto[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [searchText, setSearchText] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState<Filter>("all"),
    [sort, setSort] = useState<Sort>("balance"),
    [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<CustomerSelectionDto | "new" | null>(
      null,
    ),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      void revision;
      setLoading(true);
      setError("");
      try {
        const r = await customersService.accounts(
          { page: 1, limit: 100, search: search || undefined },
          signal,
        );
        setItems(r.items);
        setTotal(r.pagination.total);
      } catch (e) {
        if (!signal?.aborted)
          setError(apiMessages(e, "تعذر تحميل حسابات الزبائن.").join("، "));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [revision, search],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchText.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  const counts = useMemo(
    () => ({
      due: items.filter((x) => Number(x.balance) > 0).length,
      credit: items.filter((x) => Number(x.balance) < 0).length,
      balanced: items.filter((x) => Number(x.balance) === 0).length,
    }),
    [items],
  );
  const visible = useMemo(
    () =>
      items
        .filter(
          (x) =>
            filter === "all" ||
            (filter === "due" && Number(x.balance) > 0) ||
            (filter === "credit" && Number(x.balance) < 0) ||
            (filter === "balanced" && Number(x.balance) === 0),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.name.localeCompare(b.name, "ar")
            : sort === "recent"
              ? new Date(b.last_activity_at ?? 0).getTime() -
                new Date(a.last_activity_at ?? 0).getTime()
              : Math.abs(Number(b.balance)) - Math.abs(Number(a.balance)),
        ),
    [filter, items, sort],
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-black text-gold-dark">الزبائن والحسابات</p>
          <h1 className="mt-1 text-3xl font-black text-brand">الزبائن</h1>
          <p className="mt-1 text-sm text-stone-500">
            متابعة الأرصدة والوصول السريع إلى حساب كل زبون.
          </p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => setEditing("new")}
        >
          <Plus className="h-4 w-4" /> زبون جديد
        </button>
      </header>
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="rep-label">بحث مباشر</span>
            <span className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                className="rep-control pr-9"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="اسم الزبون أو رقم الهاتف"
              />
            </span>
          </label>
          <Select
            className="w-full sm:w-56 sm:shrink-0"
            label="ترتيب حسب"
            value={sort}
            onChange={setSort}
            options={[
              { value: "balance", label: "أعلى رصيد" },
              { value: "recent", label: "آخر حركة" },
              { value: "name", label: "الاسم" },
            ]}
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto border-t pt-3">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            الكل <small>{items.length}</small>
          </Chip>
          <Chip active={filter === "due"} onClick={() => setFilter("due")}>
            مدينون <small>{counts.due}</small>
          </Chip>
          <Chip
            active={filter === "credit"}
            onClick={() => setFilter("credit")}
          >
            دائنون <small>{counts.credit}</small>
          </Chip>
          <Chip
            active={filter === "balanced"}
            onClick={() => setFilter("balanced")}
          >
            متعادل <small>{counts.balanced}</small>
          </Chip>
        </div>
      </section>
      {error && <div className="rep-error">{error}</div>}
      {!loading && !error && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Users className="h-4 w-4" />
          <span>
            {search ? `${total} نتيجة` : `${total} زبون`} · المعروض{" "}
            {visible.length}
          </span>
        </div>
      )}
      {loading ? (
        <Skeleton className="h-72" />
      ) : visible.length ? (
        <CustomerList
          items={visible}
          basePath={basePath}
          onNavigate={onNavigate}
          onEdit={setEditing}
        />
      ) : (
        <EmptyState title="لا يوجد زبائن مطابقون للبحث أو الفلتر" />
      )}
      <CustomerForm
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setRevision((x) => x + 1);
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black ${active ? "border-brand bg-brand text-white" : "border-stone-200 bg-stone-50 text-stone-600"}`}
    >
      {children}
    </button>
  );
}
function Balance({ value }: { value: number }) {
  return value > 0 ? (
    <span className="inline-flex flex-col rounded-xl bg-red-50 px-3 py-2 text-red-800">
      <b>{formatMoney(value)}</b>
      <small>مطلوب من الزبون</small>
    </span>
  ) : value < 0 ? (
    <span className="inline-flex flex-col rounded-xl bg-blue-50 px-3 py-2 text-blue-800">
      <b>{formatMoney(Math.abs(value))}</b>
      <small>مستحق للزبون</small>
    </span>
  ) : (
    <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
      الحساب متعادل
    </span>
  );
}

function CustomerList({
  items,
  basePath,
  onNavigate,
  onEdit,
}: {
  items: CustomerAccountDto[];
  basePath: string;
  onNavigate: (path: string) => void;
  onEdit: (x: CustomerSelectionDto) => void;
}) {
  const open = (id: number) => onNavigate(`${basePath}/customers/${id}`);
  const row = (c: CustomerAccountDto) => (
    <>
      <td className="p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 font-black text-brand">
            {c.name.trim().charAt(0)}
          </span>
          <div>
            <strong className="block text-brand">{c.name}</strong>
            <small className="text-stone-400">ملف #{c.customer_id}</small>
          </div>
        </div>
      </td>
      <td className="p-3">
        <span dir="ltr">{c.phone}</span>
      </td>
      <td className="p-3">
        <Balance value={Number(c.balance)} />
      </td>
      <td className="p-3">
        {Number(c.pending_checks_amount) ? (
          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
            <Banknote className="h-4 w-4" />
            {formatMoney(c.pending_checks_amount)}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="p-3 text-stone-500">
        {c.last_activity_at
          ? formatOrderDate(c.last_activity_at)
          : "لا توجد حركة"}
      </td>
      <td className="p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center gap-2">
          <button
            className="btn-primary inline-flex items-center gap-1 px-3 py-2"
            onClick={() => open(Number(c.customer_id))}
          >
            <Eye className="h-4 w-4" /> فتح
          </button>
          <button
            className="rounded-lg border p-2 text-brand"
            onClick={() => onEdit(c)}
            aria-label={`تعديل ${c.name}`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  );
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-xs text-stone-600">
            <tr>
              {[
                "الزبون",
                "الهاتف",
                "الرصيد الحالي",
                "شيكات قيد التحصيل",
                "آخر حركة",
                "الإجراء",
              ].map((x) => (
                <th key={x} className="p-3 text-right last:text-center">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((c) => (
              <tr
                key={c.customer_id}
                className="cursor-pointer hover:bg-brand-50/40"
                onClick={() => open(Number(c.customer_id))}
              >
                {row(c)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {items.map((c) => (
          <article
            key={c.customer_id}
            className="rounded-2xl border bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="text-brand">{c.name}</strong>
                <span
                  dir="ltr"
                  className="mt-1 block text-right text-sm text-stone-500"
                >
                  {c.phone}
                </span>
              </div>
              <small className="rounded-lg bg-stone-50 px-2 py-1">
                #{c.customer_id}
              </small>
            </div>
            <div className="mt-4">
              <Balance value={Number(c.balance)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
              <div>
                <span className="text-stone-400">شيكات قيد التحصيل</span>
                <b className="mt-1 block text-amber-700">
                  {Number(c.pending_checks_amount)
                    ? formatMoney(c.pending_checks_amount)
                    : "—"}
                </b>
              </div>
              <div>
                <span className="text-stone-400">آخر حركة</span>
                <b className="mt-1 block">
                  {c.last_activity_at
                    ? formatOrderDate(c.last_activity_at)
                    : "لا توجد"}
                </b>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                className="btn-primary flex-1"
                onClick={() => open(Number(c.customer_id))}
              >
                فتح الحساب
              </button>
              <button className="btn-outline" onClick={() => onEdit(c)}>
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function CustomerForm({
  value,
  onClose,
  onSaved,
}: {
  value: CustomerSelectionDto | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = value && value !== "new" ? value : null;
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [debt, setDebt] = useState(""),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [reason, setReason] = useState("رصيد سابق"),
    [notes, setNotes] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setName(existing?.name ?? "");
    setPhone(existing?.phone ?? "");
    setEmail(existing?.email ?? "");
    setDebt("");
    setDate(new Date().toISOString().slice(0, 10));
    setReason("رصيد سابق");
    setNotes("");
    setError("");
  }, [existing, value]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim())
      return setError("الاسم ورقم الهاتف مطلوبان.");
    if (!existing && debt && Number(debt) <= 0)
      return setError("راجع مبلغ الدين.");
    setSaving(true);
    setError("");
    try {
      const dto = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        ...(!existing && debt
          ? {
              initial_debt_amount: Number(debt),
              initial_debt_date: `${date}T00:00:00`,
              initial_debt_reason: reason.trim(),
              initial_debt_notes: notes.trim() || undefined,
            }
          : {}),
      };
      if (existing)
        await customersService.update(Number(existing.customer_id), dto);
      else await customersService.create(dto);
      onSaved();
    } catch (err) {
      setError(apiMessages(err, "تعذر حفظ بيانات الزبون.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={existing ? "تعديل الزبون" : "زبون جديد"}
      size="lg"
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <div className="rep-error">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="rep-label">الاسم</span>
            <input
              className="rep-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <span className="rep-label">الهاتف</span>
            <input
              className="rep-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="rep-label">البريد الإلكتروني</span>
            <input
              type="email"
              className="rep-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
        {!existing && (
          <section className="space-y-3 rounded-2xl border bg-stone-50 p-4">
            <h3 className="font-black text-brand">دين على الزبون (اختياري)</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="rep-label">المبلغ</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="rep-control"
                  value={debt}
                  onChange={(e) => setDebt(e.target.value)}
                />
              </label>
              <StyledDatePicker
                label="تاريخ الدين"
                value={date}
                onChange={setDate}
              />
              <label>
                <span className="rep-label">السبب</span>
                <input
                  className="rep-control"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={!debt}
                />
              </label>
              <label>
                <span className="rep-label">ملاحظات</span>
                <input
                  className="rep-control"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!debt}
                />
              </label>
            </div>
          </section>
        )}
        <button disabled={saving} className="btn-primary w-full">
          {saving ? "جاري الحفظ…" : "حفظ"}
        </button>
      </form>
    </Modal>
  );
}
