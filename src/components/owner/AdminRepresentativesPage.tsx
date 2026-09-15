import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { KeyRound, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { representativesService, type RepresentativeResponseDto } from "@/api";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RepSelect } from "@/components/rep/RepFormControls";
import { apiMessages, formatOrderDate } from "@/components/rep/repOrderUtils";

type FormState = {
  item: RepresentativeResponseDto | null;
  name: string;
  phone: string;
  email: string;
  password: string;
};
export default function AdminRepresentativesPage({
  onNotify,
}: {
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [representatives, setRepresentatives] = useState<
    RepresentativeResponseDto[]
  >([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState<FormState | null>(null);
  const [passwordTarget, setPasswordTarget] =
    useState<RepresentativeResponseDto | null>(null);
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] =
    useState<RepresentativeResponseDto | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErrors([]);
      try {
        const response = await representativesService.list(
          status === "" ? undefined : status === "true",
          signal,
        );
        setRepresentatives(response.representatives);
      } catch (e) {
        if (!signal?.aborted) setErrors(apiMessages(e, "تعذر تحميل المناديب."));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [status],
  );
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const shown = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return q
      ? representatives.filter(
          (x) =>
            x.name.toLocaleLowerCase().includes(q) ||
            x.email.toLocaleLowerCase().includes(q) ||
            (x.phone || "").includes(q),
        )
      : representatives;
  }, [representatives, search]);
  const openCreate = () => {
    setFormErrors([]);
    setForm({ item: null, name: "", phone: "", email: "", password: "" });
  };
  const openEdit = (item: RepresentativeResponseDto) => {
    setFormErrors([]);
    setForm({
      item,
      name: item.name,
      phone: item.phone || "",
      email: item.email,
      password: "",
    });
  };
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      (!form.item && form.password.length < 6)
    )
      return setFormErrors([
        "الاسم والبريد مطلوبان، وكلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.",
      ]);
    setSaving(true);
    setFormErrors([]);
    try {
      const response = form.item
        ? await representativesService.update(form.item.user_id, {
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
          })
        : await representativesService.create({
            name: form.name.trim(),
            phone: form.phone.trim() || undefined,
            email: form.email.trim(),
            password: form.password,
          });
      setForm(null);
      onNotify(response.message, "success");
      await load();
    } catch (error) {
      setFormErrors(apiMessages(error, "تعذر حفظ بيانات المندوب."));
    } finally {
      setSaving(false);
    }
  };
  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordTarget) return;
    if (password.length < 6)
      return setFormErrors(["كلمة المرور يجب أن تتكون من 6 أحرف على الأقل."]);
    setSaving(true);
    setFormErrors([]);
    try {
      const response = await representativesService.updatePassword(
        passwordTarget.user_id,
        { password },
      );
      setPasswordTarget(null);
      setPassword("");
      onNotify(response.message, "success");
    } catch (error) {
      setFormErrors(apiMessages(error, "تعذر تغيير كلمة المرور."));
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      const response = await representativesService.updateStatus(
        statusTarget.user_id,
        { is_active: !statusTarget.is_active },
      );
      setStatusTarget(null);
      onNotify(response.message, "success");
      await load();
    } catch (e) {
      setStatusTarget(null);
      setErrors(apiMessages(e, "تعذر تحديث حالة المندوب."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-black text-gold-dark">إدارة الفريق</p>
          <h1 className="mt-1 text-3xl font-black text-brand">المناديب</h1>
          <p className="mt-2 text-sm text-stone-500">
            إدارة الحسابات والحالة وكلمات المرور دون التأثير في الطلبات
            التاريخية.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 font-black text-white"
        >
          <Plus className="h-4 w-4" />
          إضافة مندوب
        </button>
      </header>
      <section className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2">
        <label>
          <span className="rep-label">بحث محلي</span>
          <span className="relative block">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              className="rep-control pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="الاسم أو الهاتف أو البريد"
            />
          </span>
        </label>
        <RepSelect
          label="الحالة"
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: "", label: "كل المناديب" },
            { value: "true", label: "الفعالون" },
            { value: "false", label: "غير الفعالين" },
          ]}
        />
      </section>
      {errors.length > 0 && (
        <div className="rep-error text-center">
          {errors.join("، ")}
          <button
            onClick={() => setRetry((v) => v + 1)}
            className="mx-auto mt-2 flex gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <Skeleton className="h-80" />
      ) : shown.length === 0 ? (
        <EmptyState title="لا يوجد مناديب مطابقون" />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  {[
                    "المندوب",
                    "الهاتف",
                    "الحالة",
                    "تاريخ الإنشاء",
                    "الإجراءات",
                  ].map((x) => (
                    <th key={x} className="px-4 py-3 text-right">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((x) => (
                  <tr key={x.user_id}>
                    <td className="px-4 py-4">
                      <b className="block text-brand">{x.name}</b>
                      <small>{x.email}</small>
                    </td>
                    <td className="px-4" dir="ltr">
                      {x.phone || "—"}
                    </td>
                    <td className="px-4">
                      <Status active={x.is_active} />
                    </td>
                    <td className="px-4 whitespace-nowrap">
                      {formatOrderDate(x.created_at)}
                    </td>
                    <td className="px-4">
                      <Actions
                        item={x}
                        edit={() => openEdit(x)}
                        password={() => {
                          setFormErrors([]);
                          setPassword("");
                          setPasswordTarget(x);
                        }}
                        status={() => setStatusTarget(x)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {shown.map((x) => (
              <article
                key={x.user_id}
                className="rounded-2xl border bg-white p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <b className="text-brand">{x.name}</b>
                    <p className="text-xs text-stone-500">{x.email}</p>
                    <p className="text-xs text-stone-500" dir="ltr">
                      {x.phone || "—"}
                    </p>
                  </div>
                  <Status active={x.is_active} />
                </div>
                <div className="mt-4">
                  <Actions
                    item={x}
                    edit={() => openEdit(x)}
                    password={() => {
                      setFormErrors([]);
                      setPassword("");
                      setPasswordTarget(x);
                    }}
                    status={() => setStatusTarget(x)}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.item ? "تعديل بيانات المندوب" : "إضافة مندوب"}
      >
        <form onSubmit={saveProfile} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="rep-error">{formErrors.join("، ")}</div>
          )}
          <Field
            label="الاسم *"
            value={form?.name || ""}
            onChange={(v) => form && setForm({ ...form, name: v })}
          />
          <Field
            label="الهاتف"
            value={form?.phone || ""}
            onChange={(v) => form && setForm({ ...form, phone: v })}
          />
          <Field
            label="البريد الإلكتروني *"
            type="email"
            value={form?.email || ""}
            onChange={(v) => form && setForm({ ...form, email: v })}
          />
          {!form?.item && (
            <Field
              label="كلمة المرور *"
              type="password"
              value={form?.password || ""}
              onChange={(v) => form && setForm({ ...form, password: v })}
            />
          )}
          <button
            disabled={saving}
            className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
          >
            حفظ
          </button>
        </form>
      </Modal>
      <Modal
        open={passwordTarget !== null}
        onClose={() => {
          setPasswordTarget(null);
          setPassword("");
        }}
        title={`تغيير كلمة مرور ${passwordTarget?.name || ""}`}
      >
        <form onSubmit={savePassword} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="rep-error">{formErrors.join("، ")}</div>
          )}
          <Field
            label="كلمة المرور الجديدة"
            type="password"
            value={password}
            onChange={setPassword}
          />
          <button
            disabled={saving}
            className="min-h-11 w-full rounded-xl bg-brand font-black text-white"
          >
            تغيير كلمة المرور
          </button>
        </form>
      </Modal>
      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void changeStatus()}
        loading={saving}
        severity={statusTarget?.is_active ? "destructive" : "normal"}
        title={statusTarget?.is_active ? "تعطيل المندوب" : "تفعيل المندوب"}
        message={
          statusTarget?.is_active
            ? "سيُمنع المندوب من تسجيل الدخول، وستبقى طلباته التاريخية محفوظة."
            : "هل تريد إعادة تفعيل حساب المندوب؟"
        }
        confirmLabel={statusTarget?.is_active ? "تعطيل" : "تفعيل"}
      />
    </div>
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
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="rep-label">{label}</span>
      <input
        autoComplete={type === "password" ? "new-password" : undefined}
        type={type}
        className="rep-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}
    >
      {active ? "فعال" : "غير فعال"}
    </span>
  );
}
function Actions({
  item,
  edit,
  password,
  status,
}: {
  item: RepresentativeResponseDto;
  edit: () => void;
  password: () => void;
  status: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={edit}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-brand-50 px-3 font-bold text-brand"
      >
        <Pencil className="h-3.5 w-3.5" />
        تعديل
      </button>
      <button
        onClick={password}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 font-bold"
      >
        <KeyRound className="h-3.5 w-3.5" />
        كلمة المرور
      </button>
      <button
        onClick={status}
        className={`min-h-9 rounded-lg px-3 font-bold ${item.is_active ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
      >
        {item.is_active ? "تعطيل" : "تفعيل"}
      </button>
    </div>
  );
}
