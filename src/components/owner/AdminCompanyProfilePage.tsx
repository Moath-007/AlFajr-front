import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { companyProfileService, type CompanyProfileDataDto } from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiMessages } from "@/components/rep/repOrderUtils";

type Fields = {
  company_name: string;
  email: string;
  address: string;
  city: string;
  working_hours: string;
  announcement_text: string;
  announcement_enabled: boolean;
  phones: string[];
};
const fromProfile = (x: CompanyProfileDataDto): Fields => ({
  company_name: x.company_name,
  email: x.email || "",
  address: x.address || "",
  city: x.city || "",
  working_hours: x.working_hours || "",
  announcement_text: x.announcement_text || "",
  announcement_enabled: x.announcement_enabled,
  phones: x.phones,
});
export default function AdminCompanyProfilePage({
  onDirtyChange,
  onNotify,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [fields, setFields] = useState<Fields>({
    company_name: "",
    email: "",
    address: "",
    city: "",
    working_hours: "",
    announcement_text: "",
    announcement_enabled: false,
    phones: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const initial = useRef("");
  const snapshot = useMemo(() => JSON.stringify(fields), [fields]);
  const dirty = initial.current !== "" && snapshot !== initial.current;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    const fn = () => {
      if (
        dirty &&
        !window.confirm("لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟")
      )
        window.history.go(1);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, [dirty]);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrors([]);
    try {
      const response = await companyProfileService.get(signal);
      const next = fromProfile(response.company);
      setFields(next);
      initial.current = JSON.stringify(next);
    } catch (e) {
      if (!signal?.aborted)
        setErrors(apiMessages(e, "تعذر تحميل بيانات الشركة."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load, retry]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!fields.company_name.trim()) return setErrors(["اسم الشركة مطلوب."]);
    if (fields.phones.some((x) => !x.trim()))
      return setErrors(["احذف أسطر الهاتف الفارغة أو أدخل رقمًا فيها."]);
    setSaving(true);
    setErrors([]);
    try {
      const response = await companyProfileService.update({
        company_name: fields.company_name.trim(),
        email: fields.email.trim() || undefined,
        address: fields.address.trim() || undefined,
        city: fields.city.trim() || undefined,
        working_hours: fields.working_hours.trim() || undefined,
        announcement_text: fields.announcement_text.trim() || undefined,
        announcement_enabled: fields.announcement_enabled,
        phones: fields.phones.map((x) => x.trim()),
      });
      const refreshed = await companyProfileService.get();
      const next = fromProfile(refreshed.company);
      setFields(next);
      initial.current = JSON.stringify(next);
      onDirtyChange(false);
      onNotify(response.message, "success");
    } catch (error) {
      setErrors(apiMessages(error, "تعذر حفظ بيانات الشركة."));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Skeleton className="h-[650px]" />;
  if (errors.length > 0 && initial.current === "")
    return (
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
    );
  const set = (
    key: keyof Omit<Fields, "phones" | "announcement_enabled">,
    value: string,
  ) => setFields({ ...fields, [key]: value });
  return (
    <div className="space-y-6">
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">بيانات الموقع</p>
        <h1 className="mt-1 text-3xl font-black text-brand">بيانات الشركة</h1>
        <p className="mt-2 text-sm text-stone-500">
          المصدر المركزي لمعلومات التواصل وساعات العمل والإعلان العام.
        </p>
      </header>
      {errors.length > 0 && (
        <div className="rep-error" role="alert">
          {errors.join("، ")}
        </div>
      )}
      <form onSubmit={save} className="space-y-6">
        <Section title="البيانات الأساسية">
          <Field
            label="اسم الشركة *"
            value={fields.company_name}
            onChange={(v) => set("company_name", v)}
          />
          <Field
            label="البريد الإلكتروني"
            type="email"
            value={fields.email}
            onChange={(v) => set("email", v)}
          />
        </Section>
        <Section title="العنوان">
          <Field
            label="العنوان"
            value={fields.address}
            onChange={(v) => set("address", v)}
          />
          <Field
            label="المدينة"
            value={fields.city}
            onChange={(v) => set("city", v)}
          />
        </Section>
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex justify-between gap-3">
            <h2 className="font-black text-brand">أرقام التواصل</h2>
            <button
              type="button"
              onClick={() =>
                setFields({ ...fields, phones: [...fields.phones, ""] })
              }
              className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-brand-50 px-3 font-bold text-brand"
            >
              <Plus className="h-4 w-4" />
              إضافة رقم
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {fields.phones.length === 0 && (
              <p className="text-sm text-stone-500">
                لا توجد أرقام. يمكنك إضافة رقم عند الحاجة.
              </p>
            )}
            {fields.phones.map((phone, index) => (
              <div key={index} className="flex gap-2">
                <input
                  dir="ltr"
                  className="rep-control"
                  value={phone}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      phones: fields.phones.map((x, i) =>
                        i === index ? e.target.value : x,
                      ),
                    })
                  }
                  placeholder="رقم الهاتف"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFields({
                      ...fields,
                      phones: fields.phones.filter((_, i) => i !== index),
                    })
                  }
                  className="min-h-11 rounded-xl bg-red-50 px-3 text-red-700"
                  aria-label="حذف رقم الهاتف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
        <Section title="ساعات العمل">
          <label className="sm:col-span-2">
            <span className="rep-label">ساعات العمل</span>
            <textarea
              className="rep-control min-h-24"
              value={fields.working_hours}
              onChange={(e) => set("working_hours", e.target.value)}
            />
          </label>
        </Section>
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-black text-brand">الإعلان</h2>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${fields.announcement_enabled ? "border-emerald-200 bg-emerald-50/70" : "border-stone-200 bg-stone-50 hover:border-stone-300"}`}
            >
              <span className="text-sm font-bold text-brand">
                {fields.announcement_enabled ? "الإعلان فعال" : "الإعلان متوقف"}
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={fields.announcement_enabled}
                onChange={(e) =>
                  setFields({
                    ...fields,
                    announcement_enabled: e.target.checked,
                  })
                }
              />
              <span
                className="relative h-7 w-12 shrink-0 rounded-full bg-stone-300 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:-translate-x-5"
                aria-hidden="true"
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="rep-label">نص الإعلان</span>
            <textarea
              className="rep-control min-h-28"
              value={fields.announcement_text}
              onChange={(e) => set("announcement_text", e.target.value)}
            />
          </label>
        </section>
        <div className="sticky bottom-3 z-20 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur">
          <button
            disabled={saving || !dirty}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-brand px-7 font-black text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="font-black text-brand">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
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
        type={type}
        className="rep-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
