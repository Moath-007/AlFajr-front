import type { CurrencyDto } from "../api";

export function formatMoney(value: number | string | null | undefined, currency?: Pick<CurrencyDto, "symbol" | "code"> | null) {
  const amount = Number(value ?? 0);
  const label = currency?.symbol || currency?.code || "₪";
  return `${Number.isFinite(amount) ? amount.toLocaleString("ar-EG-u-nu-latn", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0"} ${label}`;
}

export function describeConvertedMoney(amount: number | string, baseAmount: number | string | null, exchangeRate: number | string | null, currency?: CurrencyDto | null) {
  const original = formatMoney(amount, currency);
  if (!currency || currency.is_base || baseAmount == null) return original;
  return `${original} · ${formatMoney(baseAmount)} (سعر الصرف ${Number(exchangeRate ?? 0).toLocaleString("ar-EG-u-nu-latn")})`;
}
