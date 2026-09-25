import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { categoriesService, resolveApiAssetUrl, type CategoryResponseDto } from "@/api";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiMessages } from "@/components/rep/repOrderUtils";

export default function AdminProductSettingsPage({
  onNotify,
}: {
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState<{
    item: CategoryResponseDto | null;
    name: string;
    image: File | null;
    removeImage: boolean;
  } | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<CategoryResponseDto | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponseDto | null>(
    null,
  );
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrors([]);
    try {
      setCategories(await categoriesService.list(signal));
    } catch (error) {
      if (!signal?.aborted)
        setErrors(apiMessages(error, "تعذر تحميل التصنيفات."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, retry]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form?.name.trim()) return setFormErrors(["اسم التصنيف مطلوب."]);
    setSaving(true);
    setFormErrors([]);
    try {
      if (form.item)
        await categoriesService.update(form.item.category_id, {
          name: form.name.trim(), image: form.image ?? undefined, remove_image: form.removeImage,
        });
      else await categoriesService.create({ name: form.name.trim(), image: form.image ?? undefined });
      onNotify(form.item ? "تم تحديث التصنيف" : "تم إنشاء التصنيف", "success");
      setForm(null);
      await load();
    } catch (error) {
      setFormErrors(apiMessages(error, "تعذر حفظ التصنيف."));
    } finally {
      setSaving(false);
    }
  };
  const changeStatus = async () => {
    if (!statusTarget) return;
    setSaving(true);
    try {
      await categoriesService.updateStatus(statusTarget.category_id, {
        is_active: !statusTarget.is_active,
      });
      setStatusTarget(null);
      onNotify("تم تحديث حالة التصنيف", "success");
      await load();
    } catch (error) {
      setStatusTarget(null);
      setErrors(apiMessages(error, "تعذر تحديث حالة التصنيف."));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await categoriesService.delete(deleteTarget.category_id);
      setDeleteTarget(null);
      onNotify("تم حذف التصنيف", "success");
      await load();
    } catch (error) {
      setDeleteTarget(null);
      setErrors(apiMessages(error, "تعذر حذف التصنيف."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-black text-gold-dark">تنظيم الكتالوج</p>
        <h1 className="mt-1 text-3xl font-black text-brand">إدارة التصنيفات</h1>
        <p className="mt-2 text-sm text-stone-500">إدارة تصنيفات المنتجات وتنظيم ظهورها في الكتالوج.</p></div>
        <button type="button" onClick={() => { setFormErrors([]); setForm({ item: null, name: "", image: null, removeImage: false }); }} className="btn-primary shrink-0"><Plus className="h-4 w-4" /> إضافة تصنيف</button>
      </header>
      <section className="space-y-4">
        {errors.length > 0 && (
          <div className="rep-error text-center">
            <p>{errors.join("، ")}</p>
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="mx-auto mt-2 flex items-center gap-2 underline"
            >
              <RefreshCw className="h-4 w-4" /> إعادة المحاولة
            </button>
          </div>
        )}
        {loading ? (
          <Skeleton className="h-72" />
        ) : categories.length === 0 ? (
          <EmptyState title="لا توجد تصنيفات" />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border bg-white md:block">
              <table className="w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {["الصورة", "التصنيف", "عدد المنتجات", "الحالة", "الإجراءات"].map(
                      (label) => (
                        <th key={label} className="px-4 py-3 text-right">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((item) => (
                    <tr key={item.category_id}>
                      <td className="px-4 py-3"><div className="h-12 w-16 overflow-hidden rounded-lg bg-stone-100">{item.image_url ? <img src={resolveApiAssetUrl(item.image_url) ?? undefined} alt="" className="h-full w-full object-cover"/> : <span className="grid h-full place-items-center text-stone-300"><ImagePlus className="h-5 w-5"/></span>}</div></td>
                      <td className="px-4 py-4 font-black text-brand">
                        {item.name}
                      </td>
                      <td className="px-4">{item.products_count}</td>
                      <td className="px-4">
                        <Status active={item.is_active} />
                      </td>
                      <td className="px-4">
                        <Actions
                          item={item}
                          edit={() => {
                            setFormErrors([]);
                            setForm({ item, name: item.name, image: null, removeImage: false });
                          }}
                          status={() => setStatusTarget(item)}
                          remove={() => setDeleteTarget(item)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {categories.map((item) => (
                <article
                  key={item.category_id}
                  className="rounded-2xl border bg-white p-4"
                >
                  <div className="flex justify-between gap-3">
                    <div className="flex items-center gap-3">{item.image_url && <img src={resolveApiAssetUrl(item.image_url) ?? undefined} alt="" className="h-12 w-14 rounded-lg object-cover"/>}<b className="text-brand">{item.name}</b></div>
                    <Status active={item.is_active} />
                  </div>
                  <p className="mt-2 text-sm text-stone-500">
                    عدد المنتجات: {item.products_count}
                  </p>
                  <div className="mt-4">
                    <Actions
                      item={item}
                      edit={() => {
                        setFormErrors([]);
                        setForm({ item, name: item.name, image: null, removeImage: false });
                      }}
                      status={() => setStatusTarget(item)}
                      remove={() => setDeleteTarget(item)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.item ? "تعديل التصنيف" : "إضافة تصنيف"}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="btn-outline flex-1"
            >
              إلغاء
            </button>
            <button
              form="category-form"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "جاري الحفظ…" : "حفظ"}
            </button>
          </div>
        }
      >
        <form id="category-form" onSubmit={save} className="space-y-5">
          {formErrors.length > 0 && (
            <div className="rep-error" role="alert">
              {formErrors.join("، ")}
            </div>
          )}
          <label>
            <span className="rep-label">اسم التصنيف</span>
            <input
              autoFocus
              maxLength={100}
              className="rep-control"
              value={form?.name || ""}
              onChange={(event) =>
                form && setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <div>
            <span className="rep-label">صورة التصنيف <small className="font-normal text-stone-400">(اختيارية)</small></span>
            {(form?.image || (form?.item?.image_url && !form.removeImage)) && <div className="mb-3 overflow-hidden rounded-xl border bg-stone-50"><img src={form.image ? URL.createObjectURL(form.image) : resolveApiAssetUrl(form?.item?.image_url) ?? undefined} alt="معاينة صورة التصنيف" className="h-40 w-full object-cover" /></div>}
            <div className="flex flex-wrap gap-2">
              <label className="btn-outline cursor-pointer"><ImagePlus className="h-4 w-4"/> اختيار صورة<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const image = event.target.files?.[0] ?? null; if (image && image.size > 5 * 1024 * 1024) return setFormErrors(["حجم الصورة يجب ألا يتجاوز 5 ميجابايت."]); if (form) setForm({ ...form, image, removeImage: false }); }}/></label>
              {(form?.image || form?.item?.image_url) && <button type="button" className="text-sm font-bold text-red-700" onClick={() => form && setForm({ ...form, image: null, removeImage: Boolean(form.item?.image_url) })}>إزالة الصورة</button>}
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void changeStatus()}
        loading={saving}
        severity={statusTarget?.is_active ? "destructive" : "normal"}
        title={statusTarget?.is_active ? "تعطيل التصنيف" : "تفعيل التصنيف"}
        message={
          statusTarget?.is_active
            ? "لن يظهر التصنيف غير الفعال في المواقع التي تعتمد حالته. هل تريد المتابعة؟"
            : "هل تريد تفعيل هذا التصنيف؟"
        }
        confirmLabel={statusTarget?.is_active ? "تعطيل" : "تفعيل"}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        loading={saving}
        severity="destructive"
        title="حذف التصنيف"
        message={`حذف التصنيف «${deleteTarget?.name || ""}»؟ سيرفض النظام الحذف إذا كان مرتبطًا بمنتجات.`}
        confirmLabel="حذف"
      />
    </div>
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
  status,
  remove,
}: {
  item: CategoryResponseDto;
  edit: () => void;
  status: () => void;
  remove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={edit} className="btn-ghost min-h-9 px-3">
        <Pencil className="h-3.5 w-3.5" /> تعديل
      </button>
      <button
        type="button"
        onClick={status}
        className="btn-outline min-h-9 px-3"
      >
        {item.is_active ? "تعطيل" : "تفعيل"}
      </button>
      <button
        type="button"
        onClick={remove}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-bold text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> حذف
      </button>
    </div>
  );
}
