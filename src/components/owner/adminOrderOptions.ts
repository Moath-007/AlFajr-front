import type { OrderType } from "@/api";

export const statusOptions = [
  { value: "", label: "كل الحالات" },
  { value: "Pending", label: "قيد الانتظار" },
  { value: "Completed", label: "مكتمل" },
  { value: "Cancelled", label: "ملغي" },
];

export const typeOptions = [
  { value: "", label: "كل الأنواع" },
  { value: "Retail", label: "طلب أونلاين" },
  { value: "Wholesale", label: "طلب جملة" },
  { value: "StoreSale", label: "بيع محل" },
];

export function orderTypeLabel(type: OrderType) {
  return type === "Retail"
    ? "طلب أونلاين"
    : type === "Wholesale"
      ? "طلب جملة"
      : "بيع محل";
}
