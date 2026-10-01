type OrderListRole = "admin" | "representative";

const key = (role: OrderListRole) => `order-permanent-delete:${role}`;

export function rememberOrderDeleted(role: OrderListRole, message: string) {
  window.sessionStorage.setItem(key(role), message);
}

export function takeOrderDeletedMessage(role: OrderListRole): string {
  const message = window.sessionStorage.getItem(key(role)) ?? "";
  window.sessionStorage.removeItem(key(role));
  return message;
}
