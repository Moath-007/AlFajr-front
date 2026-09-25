import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { ArrowRight, ImagePlus, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  categoriesService,
  colorsService,
  productsService,
  resolveApiAssetUrl,
  type CategoryResponseDto,
  type ColorResponseDto,
  type ProductImageResponseDto,
  type ProductResponseDto,
  type UpdateProductVariantDto,
} from "@/api";
import { Skeleton } from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/ui/Select";
import { apiMessages } from "@/components/rep/repOrderUtils";

type VariantDraft = {
  key: string;
  product_variant_id?: number;
  size: string;
  color_id: string;
  retail_price: string;
  retail_discount: string;
  wholesale_price: string;
  wholesale_discount: string;
};
const blankVariant = (): VariantDraft => ({
  key: crypto.randomUUID(),
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
  const validate = () => {
    const messages: string[] = [];
    if (!fields.name.trim() || !fields.code.trim() || !fields.category_id)
      messages.push("اسم المنتج والكود والتصنيف مطلوبة.");
    if (!variants.length) messages.push("يجب إضافة خيار واحد على الأقل.");
    variants.forEach((v, i) => {
      const colorId = Number(v.color_id);
      if (!v.size.trim() || !v.color_id)
        messages.push(`بيانات الحجم واللون مطلوبة للخيار ${i + 1}.`);
      else if (!Number.isInteger(colorId) || colorId <= 0)
        messages.push("يرجى اختيار لون صحيح لكل خيار.");
      else if (
        colorsLoaded &&
        !colors.some((color) => color.color_id === colorId)
      )
        messages.push(
          `لون الخيار ${i + 1} غير موجود في قائمة الألوان الحالية. يرجى اختيار لون صحيح.`,
        );
      const nums = [
        v.retail_price,
        v.retail_discount,
        v.wholesale_price,
        v.wholesale_discount,
      ].map(Number);
      if (
        nums.some((x) => !Number.isFinite(x) || x < 0)
      )
        messages.push(
          `الأسعار والخصومات يجب ألا تكون سالبة في الخيار ${i + 1}.`,
        );
    });
    const keys = variants.map(
      (v) => `${v.size.trim().toLocaleLowerCase()}:${v.color_id}`,
    );
    if (new Set(keys).size !== keys.length)
      messages.push("لا يمكن تكرار نفس الحجم واللون أكثر من مرة.");
    if (!editing && !primaryCreate) messages.push("الصورة الرئيسية مطلوبة.");
    if (editing && keptImageIds.length + newImages.length < 1)
      messages.push("يجب أن يبقى للمنتج صورة واحدة على الأقل.");
    if (
      (editing
        ? keptImageIds.length + newImages.length
        : 1 + newImages.length) > 11
    )
      messages.push("الحد الأقصى لصور المنتج هو 11 صورة.");
    return messages;
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (!found.length) setConfirmSave(true);
  };
  const payloadVariants = (): UpdateProductVariantDto[] =>
    variants.map((v) => ({
      product_variant_id: v.product_variant_id,
      size: v.size.trim(),
      color_id: Number(v.color_id),
      retail_price: Number(v.retail_price),
      retail_discount: Number(v.retail_discount),
      wholesale_price: Number(v.wholesale_price),
      wholesale_discount: Number(v.wholesale_discount),
    }));
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
    <div className="space-y-6">
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
      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-black text-brand">البيانات الأساسية</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              onChange={(category_id) => setFields({ ...fields, category_id })}
              placeholder="اختر التصنيف"
              searchPlaceholder="ابحث عن تصنيف"
              options={categories.map((category) => ({
                value: String(category.category_id),
                label: category.name,
              }))}
            />
            <label className="sm:col-span-2">
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
                className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 transition sm:col-span-2 ${fields.is_active ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200 bg-stone-50"}`}
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
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-brand">الخيارات والأسعار</h2>
              <p className="text-xs text-stone-500">
                معرفات الخيارات الحالية تبقى مرتبطة بنفس السجل عند التعديل.
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
          <div className="mt-4 space-y-4">
            {variants.map((v, index) => (
              <VariantEditor
                key={v.key}
                value={v}
                index={index}
                colors={colors}
                onCreateColor={createColor}
                onChange={(field, value) => setVariant(v.key, field, value)}
                onRemove={() =>
                  setVariants((all) => all.filter((x) => x.key !== v.key))
                }
              />
            ))}
          </div>
        </section>
        <div className="sticky bottom-3 z-20 flex gap-3 rounded-2xl border bg-white/95 p-3 shadow-xl backdrop-blur">
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
        min={type === "number" ? 0 : undefined}
        className="rep-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function VariantEditor({
  value,
  index,
  colors,
  onCreateColor,
  onChange,
  onRemove,
}: {
  value: VariantDraft;
  index: number;
  colors: ColorResponseDto[];
  onCreateColor: (name: string) => Promise<string>;
  onChange: (field: keyof VariantDraft, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-xl border bg-stone-50 p-4">
      <div className="mb-3 flex justify-between">
        <b className="text-brand">
          الخيار {index + 1}
          {value.product_variant_id
            ? ` · #${value.product_variant_id}`
            : " · جديد"}
        </b>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600"
          aria-label="إزالة الخيار"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Field
            label="الحجم *"
            value={value.size}
            onChange={(v) => onChange("size", v)}
          />
          <Select
            label="اللون *"
            searchable
            value={value.color_id}
            onChange={(colorId) => onChange("color_id", colorId)}
            onCreate={onCreateColor}
            placeholder="اختر اللون"
            searchPlaceholder="ابحث عن لون أو أضف لونًا جديدًا"
            emptyText="لا توجد ألوان مطابقة"
            options={[
              ...(!value.color_id ||
              colors.some((color) => String(color.color_id) === value.color_id)
                ? []
                : [
                    {
                      value: value.color_id,
                      label: `لون غير متاح حاليًا (#${value.color_id})`,
                    },
                  ]),
              ...colors.map((color) => ({
                value: String(color.color_id),
                label: color.name,
              })),
            ]}
          />
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <h3 className="mb-3 text-xs font-black text-brand">سعر الأونلاين</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field
              type="number"
              label="السعر *"
              value={value.retail_price}
              onChange={(v) => onChange("retail_price", v)}
            />
            <Field
              type="number"
              label="الخصم"
              value={value.retail_discount}
              onChange={(v) => onChange("retail_discount", v)}
            />
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <h3 className="mb-3 text-xs font-black text-brand">سعر الجملة</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field
              type="number"
              label="السعر *"
              value={value.wholesale_price}
              onChange={(v) => onChange("wholesale_price", v)}
            />
            <Field
              type="number"
              label="الخصم"
              value={value.wholesale_discount}
              onChange={(v) => onChange("wholesale_discount", v)}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
function ImageEditor({
  editing,
  existing,
  keptIds,
  setKeptIds,
  primaryExistingId,
  setPrimaryExistingId,
  primaryCreate,
  setPrimaryCreate,
  setNewImages,
  removeNewImage,
  primaryNewIndex,
  setPrimaryNewIndex,
  previews,
}: {
  editing: boolean;
  existing: ProductImageResponseDto[];
  keptIds: number[];
  setKeptIds: (v: number[]) => void;
  primaryExistingId: number | null;
  setPrimaryExistingId: (v: number | null) => void;
  primaryCreate: File | null;
  setPrimaryCreate: (v: File | null) => void;
  setNewImages: (v: File[]) => void;
  removeNewImage: (index: number) => void;
  primaryNewIndex: number | null;
  setPrimaryNewIndex: (v: number | null) => void;
  previews: { file: File; url: string }[];
}) {
  const [dragTarget, setDragTarget] = useState<"primary" | "additional" | null>(
    null,
  );
  const droppedFiles = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    return Array.from(event.dataTransfer.files);
  };
  const dropPrimary = (event: DragEvent<HTMLLabelElement>) => {
    const [file] = droppedFiles(event);
    setDragTarget(null);
    if (file) setPrimaryCreate(file);
  };
  const dropAdditional = (event: DragEvent<HTMLLabelElement>) => {
    const files = droppedFiles(event);
    setDragTarget(null);
    if (files.length) setNewImages(files);
  };
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="font-black text-brand">الصور</h2>
      <p className="mt-1 text-xs text-stone-500">
        JPG أو PNG أو WEBP. الحد النهائي 11 صورة.
      </p>
      {editing && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {existing.map((img) => {
            const kept = keptIds.includes(img.id);
            return (
              <div
                key={img.id}
                className={`rounded-xl border p-2 ${kept ? "" : "opacity-40"}`}
              >
                <img
                  src={resolveApiAssetUrl(img.url) || ""}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <label className="mt-2 flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primary-image"
                    disabled={!kept}
                    checked={
                      primaryExistingId === img.id && primaryNewIndex === null
                    }
                    onChange={() => {
                      setPrimaryExistingId(img.id);
                      setPrimaryNewIndex(null);
                    }}
                  />
                  رئيسية
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (kept) {
                      const next = keptIds.filter((id) => id !== img.id);
                      setKeptIds(next);
                      if (primaryExistingId === img.id)
                        setPrimaryExistingId(next[0] || null);
                    } else setKeptIds([...keptIds, img.id]);
                  }}
                  className="mt-1 text-xs font-bold text-red-600"
                >
                  {kept ? "إزالة" : "استعادة"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {!editing && (
          <div className="rounded-xl">
            <span className="rep-label">الصورة الرئيسية *</span>
            <input
              id="product-primary-image"
              type="file"
              className="peer sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPrimaryCreate(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="product-primary-image"
              onDragEnter={(event) => {
                event.preventDefault();
                setDragTarget("primary");
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragTarget(null)}
              onDrop={dropPrimary}
              className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center shadow-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 ${dragTarget === "primary" ? "scale-[1.01] border-gold bg-gold/15 shadow-lg ring-4 ring-gold/15" : "border-stone-300 bg-stone-50 hover:-translate-y-0.5 hover:border-gold hover:bg-gold/5 hover:shadow-md"}`}
            >
              <ImagePlus className="h-7 w-7 text-gold-dark" />
              <strong className="text-sm text-brand">
                اسحب الصورة الرئيسية وأفلتها هنا
              </strong>
              <span className="text-xs text-stone-500">أو اضغط للاختيار</span>
            </label>
            <p
              className="mt-2 truncate text-xs text-stone-500"
              aria-live="polite"
            >
              {primaryCreate?.name || "لم يتم اختيار صورة"}
            </p>
          </div>
        )}
        <div className="rounded-xl">
          <span className="rep-label">
            {editing ? "صور جديدة" : "صور إضافية"}
          </span>
          <input
            id="product-additional-images"
            type="file"
            className="peer sr-only"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setNewImages(Array.from(e.target.files || []))}
          />
          <label
            htmlFor="product-additional-images"
            onDragEnter={(event) => {
              event.preventDefault();
              setDragTarget("additional");
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragTarget(null)}
            onDrop={dropAdditional}
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-5 text-center shadow-sm transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-gold peer-focus-visible:ring-offset-2 ${dragTarget === "additional" ? "scale-[1.01] border-gold bg-gold/15 shadow-lg ring-4 ring-gold/15" : "border-stone-300 bg-stone-50 hover:-translate-y-0.5 hover:border-gold hover:bg-gold/5 hover:shadow-md"}`}
          >
            <ImagePlus className="h-7 w-7 text-gold-dark" />
            <strong className="text-sm text-brand">
              اسحب الصور وأفلتها هنا
            </strong>
            <span className="text-xs text-stone-500">
              أو اضغط لاختيار عدة صور
            </span>
          </label>
          <p className="mt-2 text-xs text-stone-500" aria-live="polite">
            {previews.length - (primaryCreate ? 1 : 0) > 0
              ? `تم اختيار ${previews.length - (primaryCreate ? 1 : 0)} صورة`
              : "لم يتم اختيار صور إضافية"}
          </p>
        </div>
      </div>
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {previews.map(({ file, url }, combinedIndex) => {
            const newIndex = combinedIndex - (primaryCreate ? 1 : 0);
            const isAdditional = newIndex >= 0;
            return (
              <div
                key={`${file.name}-${combinedIndex}`}
                className="rounded-xl border p-2"
              >
                <img
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <p className="mt-1 truncate text-[10px]">{file.name}</p>
                {(!primaryCreate || isAdditional) && (
                  <button
                    type="button"
                    onClick={() => removeNewImage(newIndex)}
                    className="mt-1 text-xs font-bold text-red-600"
                  >
                    إزالة
                  </button>
                )}
                {primaryCreate && !isAdditional && (
                  <button
                    type="button"
                    onClick={() => setPrimaryCreate(null)}
                    className="mt-1 text-xs font-bold text-red-600"
                  >
                    إزالة
                  </button>
                )}
                {editing && isAdditional && (
                  <label className="mt-1 flex items-center gap-1 text-xs">
                    <input
                      type="radio"
                      name="primary-image"
                      checked={primaryNewIndex === newIndex}
                      onChange={() => {
                        setPrimaryNewIndex(newIndex);
                        setPrimaryExistingId(null);
                      }}
                    />
                    رئيسية
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
        <ImagePlus className="h-4 w-4" />
        لا يتم رفع الصور إلا عند الحفظ النهائي.
      </div>
    </section>
  );
}
