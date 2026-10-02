import { useState } from "react";
import {
  returnsService,
  type ReturnVariant,
  type AccountIdentityOption,
  type SalesReturnDto,
  type SalesReturnInput,
} from "@/api";
import AccountPicker from './AccountPicker';
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { apiMessages } from "@/components/rep/repOrderUtils";
import { formatMoney } from "@/utils/money";

type Line = {
  key: string;
  customer_return_item_id?: number;
  product_variant_id: number;
  quantity: string;
  price: string;
};
const variantLabel = (v: ReturnVariant) =>
  `${v.products.name} · ${v.products.code} · ${v.colors.name} · ${v.size}${!v.is_active || !v.products.is_active ? " (غير نشط)" : ""}`;
export default function SalesReturnEditor({
  document,
  accounts,
  variants,
  onClose,
  onSaved,
}: {
  document: SalesReturnDto | null;
  accounts: AccountIdentityOption[];
  variants: ReturnVariant[];
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
      quantity: String(i.quantity),
      price: String(i.unit_price),
    })) ?? [],
  );
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState(0);
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
        title={document ? `تعديل ${document.return_number}` : "إنشاء مردود بيع"}
        size="return"
        mobileFullscreen
      >
        <div dir="rtl" className="space-y-4">
          {error && (
            <p role="alert" className="rep-error">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountPicker accounts={accounts} value={account || null} onChange={id => setAccount(id ?? 0)} label="الحساب العام" kinds={['General']} />
            <label>
              تاريخ المردود
              <input
                className="rep-control"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input
              className="rep-control"
              aria-label="البحث عن صنف"
              placeholder="ابحث عن الصنف أو الرمز"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="اختيار الخيار"
              className="rep-control"
              value={picked}
              onChange={(e) => setPicked(Number(e.target.value))}
            >
              <option value={0}>اختر المنتج / اللون / المقاس</option>
              {variants
                .filter((v) =>
                  variantLabel(v)
                    .toLowerCase()
                    .includes(search.trim().toLowerCase()),
                )
                .map((v) => (
                  <option
                    key={v.product_variant_id}
                    value={v.product_variant_id}
                  >
                    {variantLabel(v)}
                  </option>
                ))}
            </select>
            <button
              className="btn-outline"
              disabled={!picked}
              onClick={() => {
                setLines((rows) => [
                  ...rows,
                  {
                    key: crypto.randomUUID(),
                    product_variant_id: picked,
                    quantity: "1",
                    price: "",
                  },
                ]);
                setPicked(0);
              }}
            >
              إضافة سطر
            </button>
          </div>
          <div className="space-y-3">
            {lines.map((l) => (
              <div
                key={l.key}
                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[2fr_90px_110px_90px_auto]"
              >
                <select
                  className="rep-control"
                  aria-label="صنف السطر"
                  value={l.product_variant_id}
                  onChange={(e) =>
                    update(l.key, {
                      product_variant_id: Number(e.target.value),
                    })
                  }
                >
                  {variants.map((v) => (
                    <option
                      key={v.product_variant_id}
                      value={v.product_variant_id}
                    >
                      {variantLabel(v)}
                    </option>
                  ))}
                </select>
                <label>
                  الكمية
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
                  السعر ₪
                  <input
                    className="rep-control"
                    type="number"
                    min={0}
                    step="0.01"
                    value={l.price}
                    onChange={(e) => update(l.key, { price: e.target.value })}
                  />
                </label>
                <b>{formatMoney(Number(l.quantity) * Number(l.price))}</b>
                <button
                  className="text-red-700"
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
            ملاحظات
            <textarea
              className="rep-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="flex justify-between gap-3">
            <b>الإجمالي: {formatMoney(total)} ₪</b>
            <button className="btn-primary" onClick={review} disabled={saving}>
              مراجعة وحفظ
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void save()}
        loading={saving}
        severity="normal"
        title="تأكيد المردود"
        message={`تأكيد ${document ? "جميع تغييرات الحساب والتاريخ والبنود والأسعار والملاحظات" : "إنشاء المردود"} بإجمالي ${formatMoney(total)} ₪ على حساب ${accounts.find((a) => a.account_id === account)?.name ?? ""}؟`}
      />
    </>
  );
}
