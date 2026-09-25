import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Search, Trash2 } from "lucide-react";
import {
  productsService,
  returnsService,
  type ProductResponseDto,
  type ReturnType,
} from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";
import Modal from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatMoney } from "@/utils/money";

type Variant = {
  id: number;
  label: string;
  searchText: string;
  stock: number;
  suggestedPrice: number;
};
type Draft = Variant & { quantity: number; unitPrice: string };

export default function CustomerReturnLauncher({
  customerId,
  type,
  onClose,
  onSaved,
}: {
  customerId: number;
  type: ReturnType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [products, setProducts] = useState<ProductResponseDto[]>([]),
    [search, setSearch] = useState(""),
    [drafts, setDrafts] = useState<Draft[]>([]),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [page, setPage] = useState(1),
    [totalPages, setTotalPages] = useState(1),
    [totalProducts, setTotalProducts] = useState(0);
  useEffect(() => {
    if (!type) return;
    setError("");
    setDrafts([]);
    setNotes("");
    setSearch("");
    setPage(1);
  }, [type]);
  useEffect(() => {
    if (!type) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
    productsService
      .listAdmin(
        {
          page,
          limit: 10,
          search: search.trim() || undefined,
          is_active: true,
          sort_by: "name",
          sort_order: "asc",
        },
        controller.signal,
      )
      .then((response) => {
        setProducts(response.products);
        setTotalPages(Math.max(1, response.pagination.total_pages));
        setTotalProducts(response.pagination.total);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(apiMessages(reason, "تعذر تحميل المنتجات.").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [page, search, type]);
  const variants = useMemo(
    () =>
      products.flatMap((product) =>
          product.variants.map((variant) => ({
            id: Number(variant.id),
            label: `${product.name} — ${product.code} — ${variant.size} — ${variant.color.name}`,
            searchText:
              `${product.name} ${product.code} ${variant.size} ${variant.color.name}`.toLocaleLowerCase(),
            stock: variant.stock_quantity,
            suggestedPrice: Math.max(
              0,
              Number(variant.retail_price) - Number(variant.retail_discount),
            ),
          })),
        ),
    [products],
  );
  const total = drafts.reduce(
    (sum, item) => sum + item.quantity * (Number(item.unitPrice) || 0),
    0,
  );
  const add = (variant: Variant) =>
    setDrafts((current) =>
      current.some((item) => item.id === variant.id)
        ? current
        : [
            ...current,
            {
              ...variant,
              quantity: 1,
              unitPrice: String(variant.suggestedPrice || ""),
            },
          ],
    );
  const update = (id: number, change: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  const submit = async () => {
    const returnType = type;
    if (!returnType) return;
    if (!drafts.length) return setError("اختر صنفًا واحدًا على الأقل.");
    if (drafts.some((item) => item.quantity < 1 || Number(item.unitPrice) <= 0))
      return setError("راجع الكميات وأسعار الوحدات.");
    if (
      returnType === "PurchaseReturn" &&
      drafts.some((item) => item.quantity > item.stock)
    )
      return setError(
        "كمية مردود المشتريات لا يمكن أن تتجاوز المخزون المتوفر.",
      );
    setSaving(true);
    setError("");
    try {
      await returnsService.createDirect(customerId, {
        type: returnType,
        items: drafts.map((item) => ({
          product_variant_id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.unitPrice),
        })),
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (reason) {
      setError(apiMessages(reason, "تعذر إنشاء المردود.").join("، "));
    } finally {
      setSaving(false);
    }
  };
  if (!type) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={
        type === "SalesReturn" ? "مردود مبيعات مباشر" : "مردود مشتريات مباشر"
      }
      size={drafts.length ? "return" : "lg"}
      mobileFullscreen
    >
      <div className="space-y-4" dir="rtl">
        <p
          className={`rounded-xl border p-3 text-sm ${type === "SalesReturn" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}
        >
          {type === "SalesReturn"
            ? "اختر المنتجات المرتجعة من الزبون. ستعود الكميات إلى المخزون وينخفض رصيده المطلوب."
            : "اختر المنتجات التي تعيدها للزبون. ستخرج الكميات من المخزون ويزداد رصيده المطلوب."}
        </p>
        {error && <div className="rep-error">{error}</div>}
        {loading ? (
          <Skeleton className="h-72" />
        ) : (
          <div className={drafts.length ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.8fr)]" : "block"}>
            <section>
              <label className="relative block">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  className="rep-control pr-9"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  placeholder="ابحث باسم المنتج أو الكود أو المقاس أو اللون"
                />
              </label>
              <div className="mt-2 max-h-[430px] space-y-2 overflow-y-auto rounded-xl border p-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => add(variant)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-right hover:bg-brand-50"
                  >
                    <span>
                      <b className="block text-sm text-brand">
                        {variant.label}
                      </b>
                      <small className="text-stone-500">
                        المخزون: {variant.stock}
                      </small>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-gold-dark" />
                  </button>
                ))}
                {!variants.length && <p className="p-6 text-center text-sm font-bold text-stone-500">لا توجد منتجات مطابقة للبحث.</p>}
              </div>
              {totalPages > 1 && <nav className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-label="صفحات منتجات المردود"><button type="button" className="btn-outline inline-flex items-center gap-1 px-3 py-2" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronRight className="h-4 w-4"/>السابق</button><span className="rounded-lg bg-stone-50 px-3 py-2 text-xs font-bold text-stone-600">صفحة {page} من {totalPages} · {totalProducts} منتج</span><button type="button" className="btn-outline inline-flex items-center gap-1 px-3 py-2" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>التالي<ChevronLeft className="h-4 w-4"/></button></nav>}
            </section>
            {drafts.length > 0 && <section className="space-y-2">
              <h3 className="font-black text-brand">
                أصناف المردود ({drafts.length})
              </h3>
              <div className="max-h-[390px] space-y-2 overflow-y-auto">
                {drafts.map((item) => (
                  <article key={item.id} className="rounded-xl border p-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0"><b className="block text-sm leading-6 text-brand" title={item.label}>{item.label}</b><small className="mt-1 block text-stone-500">المخزون المتوفر: {item.stock}</small></div>
                      <button type="button" aria-label={`حذف ${item.label}`} title="حذف الصنف" onClick={() => setDrafts((current) => current.filter((entry) => entry.id !== item.id))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                    <label>
                      <span className="rep-label">الكمية</span>
                      <div className="flex h-11 overflow-hidden rounded-lg border bg-white">
                      <button
                        type="button"
                        className="grid w-10 shrink-0 place-items-center text-brand hover:bg-brand-50"
                        onClick={() => update(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input className="min-w-0 flex-1 border-x px-1 text-center font-bold outline-none" type="number" min="1" value={item.quantity} onChange={(event) => update(item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })}/>
                      <button type="button" className="grid w-10 shrink-0 place-items-center text-brand hover:bg-brand-50" onClick={() => update(item.id, { quantity: item.quantity + 1 })}><Plus className="h-4 w-4" /></button>
                      </div>
                    </label>
                    <label><span className="rep-label">سعر الوحدة</span><input className="rep-control" type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => update(item.id, { unitPrice: event.target.value })}/></label>
                    </div>
                  </article>
                ))}
              </div>
              <label>
                <span className="rep-label">ملاحظات</span>
                <textarea
                  className="rep-control"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </section>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <strong className="text-lg text-brand">
            الإجمالي: {formatMoney(total)}
          </strong>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={onClose}>
              إلغاء
            </button>
            <button
              className="btn-primary"
              disabled={saving || loading}
              onClick={() => void submit()}
            >
              {saving ? "جاري الحفظ…" : "تأكيد المردود"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
