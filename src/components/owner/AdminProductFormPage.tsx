import {
  categoriesService,
  colorsService,
  productsService,
  type CategoryResponseDto,
  type ColorResponseDto,
  type ProductImageResponseDto,
  type ProductResponseDto
} from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowRight, Plus, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import "./AdminProductFormPage.css";
import { productVariantPayload, validateProductDraft } from './productDraft';
import { Field, ImageEditor, VariantEditor, type VariantDraft } from './ProductEditorSections';

const blankVariant = (): VariantDraft => ({
  key: crypto.randomUUID(),
  is_active: "true",
  size: "",
  color_id: "",
  retail_price: "",
  retail_discount: "0",
  wholesale_price: "",
  wholesale_discount: "0",
});
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export default function AdminProductFormPage({
  productId,
  onNavigate,
  onDirtyChange,
  onNotify,
}: {
  productId?: number;
  onNavigate: (path: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onNotify: (message: string, type: "success" | "error") => void;
}) {
  const editing = productId !== undefined;
  const [fields, setFields] = useState({
    name: "",
    code: "",
    description: "",
    category_id: "",
    is_active: true,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([blankVariant()]);
  const [existingImages, setExistingImages] = useState<
    ProductImageResponseDto[]
  >([]);
  const [keptImageIds, setKeptImageIds] = useState<number[]>([]);
  const [primaryExistingId, setPrimaryExistingId] = useState<number | null>(
    null,
  );
  const [primaryCreate, setPrimaryCreate] = useState<File | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [primaryNewIndex, setPrimaryNewIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);
  const [colors, setColors] = useState<ColorResponseDto[]>([]);
  const [colorsLoaded, setColorsLoaded] = useState(false);
  const [auxErrors, setAuxErrors] = useState<string[]>([]);
  const [auxRetry, setAuxRetry] = useState(0);
  const [loading, setLoading] = useState(editing);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const initialSnapshot = useRef("");
  const createInitialized = useRef(false);
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        fields,
        variants,
        keptImageIds,
        primaryExistingId,
        primaryCreate: primaryCreate?.name || "",
        newImages: newImages.map((f) => `${f.name}:${f.size}`),
        primaryNewIndex,
      }),
    [
      fields,
      keptImageIds,
      newImages,
      primaryCreate,
      primaryExistingId,
      primaryNewIndex,
      variants,
    ],
  );
  const dirty =
    initialSnapshot.current !== "" && snapshot !== initialSnapshot.current;
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
    const warn = () => {
      if (
        dirty &&
        !window.confirm("لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟")
      )
        window.history.go(1);
    };
    window.addEventListener("popstate", warn);
    return () => window.removeEventListener("popstate", warn);
  }, [dirty]);
  const previewFiles = useMemo(() => {
    const all = [...(primaryCreate ? [primaryCreate] : []), ...newImages];
    return all.map((file) => ({ file, url: URL.createObjectURL(file) }));
  }, [newImages, primaryCreate]);
  useEffect(
    () => () => previewFiles.forEach((x) => URL.revokeObjectURL(x.url)),
    [previewFiles],
  );
  useEffect(() => {
    const c = new AbortController();
    setAuxErrors([]);
    Promise.allSettled([
      categoriesService.list(c.signal),
      colorsService.list(c.signal),
    ]).then(([cats, cols]) => {
      if (c.signal.aborted) return;
      if (cats.status === "fulfilled") setCategories(cats.value);
      else
        setAuxErrors((v) => [
          ...v,
          ...apiMessages(cats.reason, "تعذر تحميل التصنيفات."),
        ]);
      if (cols.status === "fulfilled") {
        setColors(cols.value);
        setColorsLoaded(true);
      } else
        setAuxErrors((v) => [
          ...v,
          ...apiMessages(cols.reason, "تعذر تحميل الألوان."),
        ]);
    });
    return () => c.abort();
  }, [auxRetry]);
  const applyProduct = useCallback((p: ProductResponseDto) => {
    const nextFields = {
      name: p.name,
      code: p.code,
      description: p.description || "",
      category_id: String(p.category.id),
      is_active: p.is_active,
    };
    const nextVariants = p.variants.map((v) => ({
      key: `existing-${v.id}`,
      is_active: String(v.is_active),
      product_variant_id: v.id,
      size: v.size,
      color_id: String(v.color.id),
      retail_price: v.retail_price,
      retail_discount: v.retail_discount,
      wholesale_price: v.wholesale_price,
      wholesale_discount: v.wholesale_discount,
    }));
    const ids = p.images.map((x) => x.id);
    const primary =
      p.images.find((x) => x.is_primary)?.id || p.images[0]?.id || null;
    setFields(nextFields);
    setVariants(nextVariants);
    setExistingImages(p.images);
    setKeptImageIds(ids);
    setPrimaryExistingId(primary);
    setPrimaryCreate(null);
    setNewImages([]);
    setPrimaryNewIndex(null);
    initialSnapshot.current = JSON.stringify({
      fields: nextFields,
      variants: nextVariants,
      keptImageIds: ids,
      primaryExistingId: primary,
      primaryCreate: "",
      newImages: [],
      primaryNewIndex: null,
    });
  }, []);
  useEffect(() => {
    if (!editing && !createInitialized.current) {
      initialSnapshot.current = snapshot;
      createInitialized.current = true;
    }
  }, [editing, snapshot]);
  useEffect(() => {
    if (!editing) return;
    const c = new AbortController();
    setLoading(true);
    setErrors([]);
    productsService
      .getAdminById(productId, c.signal)
      .then((r) => applyProduct(r.product))
      .catch((e) => {
        if (!c.signal.aborted) setErrors(apiMessages(e, "تعذر تحميل المنتج."));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [applyProduct, editing, productId, retry]);
  const setVariant = (key: string, field: keyof VariantDraft, value: string) =>
    setVariants((all) =>
      all.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  const createColor = async (name: string) => {
    const trimmedName = name.trim();
    try {
      const created = await colorsService.create({ name: trimmedName });
      setColors((current) =>
        current.some((color) => color.color_id === created.color_id)
          ? current
          : [...current, created],
      );
      setColorsLoaded(true);
      return String(created.color_id);
    } catch (error) {
      try {
        const refreshed = await colorsService.list();
        setColors(refreshed);
        setColorsLoaded(true);
        const existing = refreshed.find(
          (color) => color.name.trim() === trimmedName,
        );
        if (existing) return String(existing.color_id);
      } catch {
        // Preserve and report the original POST error.
      }
      throw new Error(apiMessages(error, "تعذر إضافة اللون.").join("، "));
    }
  };
  const validate = () => validateProductDraft({ fields, variants, colorsLoaded, colors, editing, primaryCreate, keptImageIds, newImages });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (!found.length) setConfirmSave(true);
  };
  const payloadVariants = () => productVariantPayload(variants, editing);
  const imagesChanged = () =>
    editing &&
    (keptImageIds.length !== existingImages.length ||
      keptImageIds.some((id, i) => id !== existingImages.map((x) => x.id)[i]) ||
      primaryExistingId !==
      (existingImages.find((x) => x.is_primary)?.id ||
        existingImages[0]?.id ||
        null) ||
      newImages.length > 0 ||
      primaryNewIndex !== null);
  const save = async () => {
    setSaving(true);
    setErrors([]);
    try {
      let successMessage = "تم حفظ المنتج بنجاح";
      if (editing && productId) {
        const updateResult = await productsService.update(productId, {
          name: fields.name.trim(),
          code: fields.code.trim(),
          description: fields.description.trim() || undefined,
          category_id: Number(fields.category_id),
          is_active: fields.is_active,
          variants: payloadVariants(),
        });
        successMessage = updateResult.message;
        if (imagesChanged()) {
          const imageResult = await productsService.updateImages(productId, {
            existingImageIds: keptImageIds,
            primaryExistingImageId:
              primaryNewIndex === null
                ? primaryExistingId || undefined
                : undefined,
            primaryNewImageIndex: primaryNewIndex ?? undefined,
            newImages,
          });
          successMessage = imageResult.message;
        }
        const refreshed = await productsService.getAdminById(productId);
        applyProduct(refreshed.product);
      } else if (primaryCreate) {
        const result = await productsService.create({
          name: fields.name.trim(),
          code: fields.code.trim(),
          description: fields.description.trim() || undefined,
          category_id: Number(fields.category_id),
          variants: payloadVariants(),
          primary_image: primaryCreate,
          additional_images: newImages,
        });
        successMessage = result.message;
      }
      setConfirmSave(false);
      initialSnapshot.current = "";
      onDirtyChange(false);
      onNotify(successMessage, "success");
      onNavigate("/owner/products");
    } catch (e) {
      setConfirmSave(false);
      setErrors(apiMessages(e, "تعذر حفظ المنتج."));
      requestAnimationFrame(() =>
        document
          .getElementById("product-form-errors")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    } finally {
      setSaving(false);
    }
  };
  const acceptFiles = (files: File[]) => {
    const invalid = files.some((f) => !allowedTypes.has(f.type));
    if (invalid) {
      setErrors(["أنواع الصور المسموحة هي JPG وPNG وWEBP."]);
      return [];
    }
    return files;
  };
  if (loading) return <Skeleton className="h-[700px]" />;
  if (editing && errors.length && initialSnapshot.current === "")
    return (
      <div className="rep-error text-center">
        {errors.join("، ")}
        <button
          onClick={() => setRetry((v) => v + 1)}
          className="mx-auto mt-3 flex gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  return (
    <div
      className={editing ? "product-editor space-y-3" : "space-y-6"}
      dir="rtl"
    >
      <button
        onClick={() => onNavigate("/owner/products")}
        className="inline-flex items-center gap-2 text-sm font-bold text-stone-600"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للمنتجات
      </button>
      <header className="border-b pb-5">
        <p className="text-xs font-black text-gold-dark">
          {editing ? `منتج #${productId}` : "منتج جديد"}
        </p>
        <h1 className="mt-1 text-3xl font-black text-brand">
          {editing ? "تعديل المنتج" : "إنشاء منتج"}
        </h1>
      </header>
      {auxErrors.length > 0 && (
        <div className="flex justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
          <span>{auxErrors.join("، ")}</span>
          <button
            onClick={() => setAuxRetry((v) => v + 1)}
            className="underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
      {errors.length > 0 && (
        <div id="product-form-errors" role="alert" className="rep-error">
          {errors.join("، ")}
        </div>
      )}
      <form onSubmit={submit} className={editing ? "space-y-3" : "space-y-6"}>
        <div className={editing ? "product-editor-overview" : "space-y-6"}>
          <section className="product-editor-basics rounded-2xl border bg-white p-5">
            <h2 className="font-black text-brand">البيانات الأساسية</h2>
            <div className="product-editor-fields mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="اسم المنتج *"
                value={fields.name}
                onChange={(v) => setFields({ ...fields, name: v })}
              />
              <Field
                label="الكود *"
                value={fields.code}
                onChange={(v) => setFields({ ...fields, code: v })}
              />
              <Select
                label="التصنيف *"
                searchable
                value={fields.category_id}
                onChange={(category_id) =>
                  setFields({ ...fields, category_id })
                }
                placeholder="اختر التصنيف"
                searchPlaceholder="ابحث عن تصنيف"
                options={categories.map((category) => ({
                  value: String(category.category_id),
                  label: category.name,
                }))}
              />
              <label className="product-editor-description sm:col-span-2">
                <span className="rep-label">الوصف</span>
                <textarea
                  className="rep-control min-h-24"
                  value={fields.description}
                  onChange={(e) =>
                    setFields({ ...fields, description: e.target.value })
                  }
                />
              </label>
              {editing && (
                <label
                  className={`product-editor-status flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition sm:col-span-2 ${fields.is_active ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200 bg-stone-50"}`}
                >
                  <span>
                    <b className="block text-sm text-brand">حالة المنتج</b>
                    <small className="text-stone-500">
                      {fields.is_active
                        ? "المنتج فعال ويظهر في القنوات المتاحة."
                        : "المنتج غير فعال ولن يظهر للبيع."}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={fields.is_active}
                    onChange={(e) =>
                      setFields({ ...fields, is_active: e.target.checked })
                    }
                  />
                  <span
                    className="relative h-7 w-12 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 after:absolute after:right-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:-translate-x-5"
                    aria-hidden="true"
                  />
                </label>
              )}
            </div>
          </section>
          <ImageEditor
            editing={editing}
            existing={existingImages}
            keptIds={keptImageIds}
            setKeptIds={setKeptImageIds}
            primaryExistingId={primaryExistingId}
            setPrimaryExistingId={setPrimaryExistingId}
            primaryCreate={primaryCreate}
            setPrimaryCreate={(f) =>
              setPrimaryCreate(f ? acceptFiles([f])[0] || null : null)
            }
            setNewImages={(files) => setNewImages(acceptFiles(files))}
            removeNewImage={(index) => {
              setNewImages((files) =>
                files.filter((_, itemIndex) => itemIndex !== index),
              );
              setPrimaryNewIndex((current) =>
                current === index
                  ? null
                  : current !== null && current > index
                    ? current - 1
                    : current,
              );
            }}
            primaryNewIndex={primaryNewIndex}
            setPrimaryNewIndex={setPrimaryNewIndex}
            previews={previewFiles}
          />
        </div>
        <section className="product-editor-variants rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-brand">
                الأصناف والأسعار ({variants.length})
              </h2>
              <p className="text-xs text-stone-500">
                الحجم واللون وأسعار البيع لكل صنف.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVariants((v) => [...v, blankVariant()])}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 font-black text-white"
            >
              <Plus className="h-4 w-4" />
              إضافة خيار
            </button>
          </div>
          <div className="product-variants-table-wrap mt-3">
            <table className="product-variants-table">
              <thead>
                <tr>
                  {[
                    "الصنف",
                    "الحجم",
                    "اللون",
                    "سعر الأونلاين",
                    "خصم الأونلاين",
                    "سعر الجملة",
                    "خصم الجملة",
                    "الحالة",
                    "الإجراء",
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map((v, index) => (
                  <VariantEditor
                    key={v.key}
                    value={v}
                    index={index}
                    colors={colors}
                    onCreateColor={createColor}
                    onChange={(field, value) => setVariant(v.key, field, value)}
                    onRemove={() =>
                      setVariants((all) =>
                        v.product_variant_id
                          ? all.map((x) =>
                            x.key === v.key
                              ? {
                                ...x,
                                is_active:
                                  x.is_active === "true" ? "false" : "true",
                              }
                              : x,
                          )
                          : all.filter((x) => x.key !== v.key),
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="product-editor-save sticky bottom-3 z-20 flex gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur">
          <button
            disabled={saving}
            className="min-h-12 rounded-xl bg-brand px-7 font-black text-white disabled:opacity-50"
          >
            {saving ? "جاري الحفظ…" : "حفظ المنتج"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/owner/products")}
            className="min-h-12 rounded-xl border px-7 font-bold"
          >
            إلغاء
          </button>
        </div>
      </form>
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={() => void save()}
        loading={saving}
        severity="normal"
        title="تأكيد حفظ المنتج"
        message={`سيتم حفظ البيانات و${variants.length} خيارًا${imagesChanged() ? " وتحديث الصور" : ""}.`}
        confirmLabel="حفظ"
      />
    </div>
  );
}
