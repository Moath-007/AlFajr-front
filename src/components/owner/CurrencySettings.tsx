import { useCallback, useEffect, useState } from "react";
import { Coins, Plus, RefreshCw } from "lucide-react";
import { currenciesService, type CurrencyDto } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";

export default function CurrencySettings({
  onNotify,
}: {
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [items, setItems] = useState<CurrencyDto[]>([]);
  const [fields, setFields] = useState({ code: "", name: "", symbol: "" });
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [errors, setErrors] = useState<string[]>([]);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrors([]);
    try {
      const response = await currenciesService.list(signal);
      setItems(
        Array.isArray(response)
          ? response
          : (response.items ?? response.currencies ?? []),
      );
    } catch (error) {
      if (!signal?.aborted)
        setErrors(apiMessages(error, "تعذر تحميل العملات."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const create = async () => {
    if (!fields.code.trim() || !fields.name.trim() || !fields.symbol.trim())
      return setErrors(["رمز العملة واسمها ورمز العرض مطلوبة."]);
    setSaving(true);
    setErrors([]);
    try {
      const response = await currenciesService.create({
        code: fields.code.trim().toUpperCase(),
        name: fields.name.trim(),
        symbol: fields.symbol.trim(),
      });
      setFields({ code: "", name: "", symbol: "" });
      onNotify(response.message, "success");
      await load();
    } catch (error) {
      setErrors(apiMessages(error, "تعذر إضافة العملة."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="company-currencies rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-gold-dark" />
        <div>
          <h2 className="font-black text-brand">العملات</h2>
          <p className="text-sm text-stone-500">
            العملات المضافة تظهر مباشرة في نماذج الدفعات مع حقل سعر الصرف.
          </p>
        </div>
      </div>
      {errors.length > 0 && (
        <div className="rep-error mt-4">{errors.join("، ")}</div>
      )}
      <div className="currency-create-fields mt-4 grid gap-3 sm:grid-cols-3">
        <Field
          label="رمز العملة"
          placeholder="USD"
          value={fields.code}
          onChange={(code) => setFields({ ...fields, code })}
        />
        <Field
          label="اسم العملة"
          placeholder="دولار أمريكي"
          value={fields.name}
          onChange={(name) => setFields({ ...fields, name })}
        />
        <Field
          label="رمز العرض"
          placeholder="$"
          value={fields.symbol}
          onChange={(symbol) => setFields({ ...fields, symbol })}
        />
      </div>
      <button
        type="button"
        disabled={saving}
        className="btn-primary mt-3 inline-flex items-center gap-2"
        onClick={() => void create()}
      >
        <Plus className="h-4 w-4" />
        {saving ? "جاري الإضافة…" : "إضافة عملة"}
      </button>
      <div className="mt-5 border-t pt-4">
        {loading ? (
          <p className="text-sm text-stone-500">جاري تحميل العملات…</p>
        ) : items.length === 0 ? (
          <button
            className="inline-flex items-center gap-2"
            onClick={() => void load()}
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        ) : (
          <div className="currency-table-wrap">
            <table className="currency-table">
              <thead>
                <tr>
                  <th>العملة</th>
                  <th>رمز العرض</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {items.map((currency) => (
                  <tr key={currency.currency_id}>
                    <td>
                      <b dir="ltr">{currency.code}</b>
                      <span>{currency.name}</span>
                    </td>
                    <td>
                      <span dir="auto">{currency.symbol}</span>
                    </td>
                    <td>
                      <span
                        className={`currency-badge ${currency.is_base || currency.is_active ? "is-active" : ""}`}
                      >
                        {currency.is_base
                          ? "أساسية"
                          : currency.is_active
                            ? "فعالة"
                            : "متوقفة"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="rep-label">{label}</span>
      <input
        className="rep-control"
        dir="auto"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
