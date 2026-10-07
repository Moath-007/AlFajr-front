import { useState } from "react";
import {
  returnsService,
  type ReturnVariant,
  type AccountIdentityOption,
  type SalesReturnDto,
  type SalesReturnInput,
} from "@/api";
import { RepDateInput } from '@/components/rep/RepFormControls';
import './ReturnsOperationsPage.css';
import AccountPicker from './AccountPicker';
import ReturnVariantSelect from './ReturnVariantSelect';
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { apiMessages } from "@/components/rep/repOrderUtils";
import { formatMoney } from "@/utils/money";

type Line = {
  key: string;
  customer_return_item_id?: number;
  product_variant_id: number;
  variant: ReturnVariant;
  quantity: string;
  price: string;
};
export default function SalesReturnEditor({
  document,
  accounts,
  onClose,
  onSaved,
}: {
  document: SalesReturnDto | null;
  accounts: AccountIdentityOption[];
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const [account, setAccount] = useState(document?.account_id ?? 0);
  const [date, setDate] = useState(
    document?.return_date.slice(0, 10) ??
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Hebron",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
  );
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(
    document?.items.map((i) => ({
      key: String(i.customer_return_item_id),
      customer_return_item_id: i.customer_return_item_id,
      product_variant_id: i.product_variant_id,
      variant: { ...i.product_variants, product_variant_id: i.product_variant_id },
      quantity: String(i.quantity),
      price: String(i.unit_price),
    })) ?? [],
  );
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = lines.reduce(
    (s, l) => s + Number(l.quantity) * Number(l.price),
    0,
  );
  const update = (key: string, patch: Partial<Line>) =>
    setLines((rows) =>
      rows.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  const review = () => {
    if (
      !account ||
      !date ||
      !lines.length ||
      !Number.isFinite(total) ||
      total > 9999999999.99 ||
      lines.some(
        (l) =>
          !l.product_variant_id ||
          !/^\d+$/.test(l.quantity) ||
          Number(l.quantity) < 1 ||
          !Number.isSafeInteger(Number(l.quantity)) ||
          Number(l.quantity) > 2147483647 ||
          !/^\d+(?:\.\d{1,2})?$/.test(l.price) ||
          Number(l.price) > 99999999.99,
      )
    ) {
      setError(
        "اختر الحساب والتاريخ وأضف بندًا بكمية صحيحة موجبة وسعر يدوي صفر أو أكثر.",
      );
      return;
    }
    setError("");
    setConfirm(true);
  };
  const save = async () => {
    if (saving) return;
    setSaving(true);
    const dto: SalesReturnInput = {
      account_id: account,
      return_date: date,
      notes: notes.trim() || undefined,
      items: lines.map((l) => ({
        ...(l.customer_return_item_id && {
          customer_return_item_id: l.customer_return_item_id,
        }),
        product_variant_id: l.product_variant_id,
        quantity: Number(l.quantity),
        unit_price: Number(l.price),
      })),
    };
    try {
      const row = document
        ? await returnsService.edit(document.customer_return_id, dto)
        : await returnsService.create(dto);
      onSaved(row.customer_return_id);
    } catch (e) {
      setError(apiMessages(e, "تعذر حفظ المردود.").join("، "));
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Modal
        open
        onClose={saving ? () => undefined : onClose}
        title={document ? `تعديل ${document.return_number}` : "إنشاء مردود مبيعات"}
        className="return-editor-modal"
        size="return"
        mobileFullscreen
        footer={<div dir="rtl" className="return-editor-total"><div><span className="text-xs text-stone-500">الإجمالي · {lines.length} بند</span><b className="block text-xl text-brand">{formatMoney(total)}</b></div><button className="btn-primary min-h-11" onClick={review} disabled={saving}>مراجعة وحفظ</button></div>}
      >
        <div dir="rtl" className="space-y-4">
          {error && (
            <p role="alert" className="rep-error">
              {error}
            </p>
          )}
          <div className="return-editor-meta">
            <AccountPicker accounts={accounts} value={account || null} onChange={id => setAccount(id ?? 0)} label="الحساب العام" kinds={['General']} />
            <RepDateInput label="تاريخ المردود" value={date} onChange={setDate} disabled={saving}/>
          </div>
          <section className="return-editor-add"><h4 className="return-editor-section-title">إضافة الأصناف</h4><div className="return-editor-add-controls">
            <ReturnVariantSelect disabled={saving} onChange={variant => setLines(rows => [...rows, { key: crypto.randomUUID(), product_variant_id: variant.product_variant_id, variant, quantity: "1", price: "" }])} />
          </div>
          </section>
          <h4 className="return-editor-section-title">بنود المردود ({lines.length})</h4>
          <p className="text-xs text-stone-500">سعر المردود المالي مستقل عن تكلفة المخزون. يمكن تكرار الصنف في أكثر من بند.</p>
          {!lines.length&&<p className="returns-state">أضف الأصناف المراد إرجاعها.</p>}
          <div className="space-y-3">
            {lines.map((l) => (
              <div
                key={l.key}
                className="return-editor-line"
              >
                <ReturnVariantSelect value={l.variant} disabled={saving} onChange={variant => update(l.key, { product_variant_id: variant.product_variant_id, variant })} />

                <label>
                  <span className="rep-label">الكمية</span>
                  <input
                    className="rep-control"
                    type="number"
                    min={1}
                    step={1}
                    value={l.quantity}
                    onChange={(e) =>
                      update(l.key, { quantity: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span className="rep-label">سعر المردود ₪</span>
                  <input
                    className="rep-control"
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.price}
                    onChange={(e) => update(l.key, { price: e.target.value })}
                  />
                </label>
                <div><span className="rep-label">قيمة البند</span><b>{formatMoney(Number(l.quantity) * Number(l.price))}</b></div>
                <button
                  className="btn-ghost min-h-11 text-red-700"
                  onClick={() =>
                    setLines((rows) => rows.filter((r) => r.key !== l.key))
                  }
                >
                  إزالة
                </button>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="rep-label">ملاحظات (اختيارية)</span>
            <textarea
              className="rep-control"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void save()}
        loading={saving}
        severity="normal"
        title="تأكيد المردود"
        message={`تأكيد ${document ? "جميع تغييرات الحساب والتاريخ والبنود والأسعار والملاحظات" : "إنشاء المردود"} بإجمالي ${formatMoney(total)} على حساب ${accounts.find((a) => a.account_id === account)?.name ?? ""}؟`}
      />
    </>
  );
}
