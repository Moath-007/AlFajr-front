import type { ApiOrderStatus, OrderType } from "@/api";

export function canEditOrder(
  order: { order_type: OrderType; status: ApiOrderStatus },
  role: "Admin" | "Representative",
): boolean {
  if (order.status === "Cancelled") return false;
  if (role === "Representative") return order.order_type === "Wholesale";
  if (order.order_type === "StoreSale") return order.status === "Completed";
  return order.order_type === "Retail" || order.order_type === "Wholesale";
}
