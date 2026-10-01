import type { OrderResponseDto, OrderType } from "@/api";

export function orderSourceLabel(type: OrderType): string {
  switch (type) {
    case "Retail": return "أونلاين";
    case "Wholesale": return "بيع جملة";
    case "StoreSale": return "بيع مفرق";
  }
}

export function orderSaleAccountLabel(
  order: Pick<OrderResponseDto, "sale_account" | "order_type" | "status">,
): string {
  if (order.sale_account) return order.sale_account.name;
  if (order.order_type === "Retail" && order.status === "Pending") return "يُحدد عند التأكيد";
  return "غير محدد";
}
