import { useEffect, useMemo, useState } from "react";
import {
  accountsService,
  returnsService,
  type PurchaseReturnDto,
  type AccountIdentityOption,
} from "@/api";
import type { PickedOrderItem } from '@/components/rep/RepProductPicker';
import ReturnVariantSelect from './ReturnVariantSelect';
import { apiMessages } from "@/components/rep/repOrderUtils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { formatMoney } from "@/utils/money";
import "./ReturnsOperationsPage.css";
import AccountPicker from "./AccountPicker";
import { RepDateInput } from "@/components/rep/RepFormControls";

type DraftItem = PickedOrderItem & {
  price: string;
  customer_return_item_id?: number;
};

export default function AccountReturnLauncher({
  open,
  onClose,
  onSaved,
  document,
}: {
  document?: PurchaseReturnDto | null;
  open: boolean;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [accounts, setAccounts] = useState<AccountIdentityOption[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const type = "PurchaseReturn" as const;
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.quantity * Number(item.price || 0),
        0,
      ),
    [items],
  );
  const account = accounts.find((item) => item.account_id === accountId);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAccountId(document?.account_id ?? null);
    setItems(
      document?.items.map((i) => ({
        product_variant_id: i.product_variant_id,
        customer_return_item_id: i.customer_return_item_id,
        quantity: i.quantity,
        price: String(i.unit_price),
        label: [
          i.product_variants.products.name,
          i.product_variants.products.code,
          i.product_variants.colors.name,
          i.product_variants.size,
        ].join(" · "),
        stock: 0,
        display_price: String(i.unit_price),
      })) ?? [],
    );
    setNotes(document?.notes ?? "");
    setDate(
      document?.return_date.slice(0, 10) ??
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Hebron",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
    );
    setError("");
    setLoading(true);
    accountsService
      .allOptions({ type: "General" }, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setAccounts(rows);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(apiMessages(reason, "تعذر تحميل الحسابات.").join("، "));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, document]);

  const review = () => {
    if (!date) {
      setError("اختر تاريخ المردود.");
      return;
    }
    if (!accountId) {
      setError("اختر الحساب الذي سيسجل عليه المردود.");
      return;
    }
    if (!Number.isFinite(total) || total > 9999999999.99) {
      setError("الإجمالي خارج النطاق المسموح.");
      return;
    }
    if (!items.length) {
      setError("أضف صنفًا واحدًا على الأقل.");
      return;
    }
    if (
      items.some(
        (item) =>
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 2147483647 ||
          !/^\d+(?:\.\d{1,2})?$/.test(item.price) ||
          Number(item.price) <= 0 ||
          Number(item.price) > 99999999.99,
      )
    ) {
      setError(
        "راجع كمية وسعر كل صنف. السعر يجب أن يكون موجبًا وبمنزلتين عشريتين كحد أقصى.",
      );
      return;
    }
    setError("");
    setConfirmOpen(true);
  };
  const submit = async () => {
    if (saving || !accountId) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        account_id: accountId,
        type,
        return_date: date,
        items: items.map((item) => ({
          ...(item.customer_return_item_id && {
            customer_return_item_id: item.customer_return_item_id,
          }),
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: Number(item.price),
        })),
        notes: notes.trim() || undefined,
      };
      if (document) {
        const response = await returnsService.editPurchase(
          document.customer_return_id,
          payload,
        );
        setConfirmOpen(false);
        onSaved(response.customer_return_id);
      } else {
        const response = await returnsService.createPurchaseForAccount(payload);
        setConfirmOpen(false);
        onSaved(response.return_id);
      }
    } catch (reason) {
      setConfirmOpen(false);
      setError(apiMessages(reason, "تعذر تسجيل المردود.").join("، "));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={saving ? () => undefined : onClose}
        title={
          document
            ? "تعديل مردود مشتريات #" + document.customer_return_id
            : "إنشاء مردود مشتريات"
        }
        className="return-editor-modal"
        size="return"
        mobileFullscreen
        footer={
          <div dir="rtl" className="return-editor-total">
            <div>
              <span className="text-xs text-stone-500">
                الإجمالي · {items.length} بند
              </span>
              <b className="block text-xl text-brand">{formatMoney(total)}</b>
            </div>
            <button
              type="button"
              className="btn-primary min-h-11"
              disabled={loading || saving}
              onClick={review}
            >
              {document ? "مراجعة وحفظ" : "مراجعة واعتماد"}
            </button>
          </div>
        }
      >
        <div className="space-y-4" dir="rtl">
          <div className="return-editor-meta">
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
              label="الحساب"
              kinds={["General"]}
              disabled={loading || !!document?.customer_purchase_id}
            />
            <RepDateInput
              label="تاريخ المردود"
              value={date}
              onChange={setDate}
              disabled={saving}
            />
          </div>
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand">
            {"سيخرج الصنف من المخزون وتُسجل قيمته مستحقة على الحساب."}
          </p>
          {error && (
            <div className="rep-error" role="alert">
              {error}
            </div>
          )}
          <section className="return-editor-add">
            <h3 className="return-editor-section-title">إضافة الأصناف</h3>
            <div className="return-editor-add-controls">
              <ReturnVariantSelect disabled={loading || saving} onChange={variant => {
                setItems(rows => {
                  const existing = rows.find(item => item.product_variant_id === variant.product_variant_id);
                  if (existing) return rows.map(item => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
                  return [...rows, { product_variant_id: variant.product_variant_id, quantity: 1, price: '', label: [variant.products.name, variant.products.code, variant.colors.name, variant.size].join(' · '), stock: 0, display_price: '' }];
                });
              }} />
            </div>
          </section>
          <h3 className="return-editor-section-title">بنود المردود ({items.length})</h3>
          {items.length ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.product_variant_id}
                  className="return-editor-line"
                >
                  <b className="self-center text-sm text-brand">{item.label}</b>
                  <label>
                    <span className="rep-label">الكمية</span>
                    <input
                      className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        setItems((rows) =>
                          rows.map((row) =>
                            row.product_variant_id === item.product_variant_id
                              ? { ...row, quantity: Number(event.target.value) }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    <span className="rep-label">سعر المردود</span>
                    <input
                      className="rep-control appearance-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        setItems((rows) =>
                          rows.map((row) =>
                            row.product_variant_id === item.product_variant_id
                              ? { ...row, price: event.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <b className="pb-2 text-center text-brand" dir="ltr">
                    {formatMoney(item.quantity * Number(item.price || 0))}
                  </b>
                  <button
                    type="button"
                    className="btn-ghost min-h-11 text-sm font-bold text-red-700"
                    onClick={() =>
                      setItems((rows) =>
                        rows.filter(
                          (row) =>
                            row.product_variant_id !== item.product_variant_id,
                        ),
                      )
                    }
                  >
                    إزالة
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-stone-500">
              لم تُضف أصناف بعد.
            </p>
          )}
          <label className="block">
            <span className="rep-label">ملاحظات (اختيارية)</span>
            <textarea
              className="rep-control resize-none"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmOpen && open}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
        loading={saving}
        severity="normal"
        title={document ? "حفظ تعديل المردود" : "اعتماد المردود"}
        message={`سيُسجل مردود ${"شراء"} على حساب ${account?.name ?? "—"}، مع تحديث المخزون والدفتر المالي.`}
        confirmLabel={document ? "حفظ التعديل" : "اعتماد المردود"}
        details={
          <div className="flex justify-between gap-2">
            <span>{items.length} أصناف</span>
            <b>{formatMoney(total)}</b>
          </div>
        }
      />
    </>
  );
}
