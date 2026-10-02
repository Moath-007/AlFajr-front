import type { ApiOrderStatus } from "@/api";
export function canEditOrder(
  order: { status: ApiOrderStatus },
  role: "Admin" | "Representative",
) {
  return (
    order.status === "Completed" ||
    (order.status === "Pending" && role === "Admin")
  );
}
