import type { ComponentType } from "react";
import {
  Banknote, BarChart3, Boxes, ClipboardList, FileText, LayoutDashboard,
  Package, ReceiptText, Settings2, ShoppingBasket, ShoppingCart, Store, Users,
} from "lucide-react";

type Icon = ComponentType<{ className?: string }>;
export type NavLink = { path: string; label: string; icon: Icon; aliases?: string[]; badge?: boolean };
export type NavBranch = { path: string; label: string; icon: Icon; children: NavLink[] };
export type NavChild = NavLink | NavBranch;
export type NavGroup = { label: string; icon: Icon; children: NavChild[] };
export type NavItem = NavLink | NavGroup;

export const ownerNavigation: NavItem[] = [
  { path: "/owner", label: "لوحة التحكم", icon: LayoutDashboard },
  { label: "المبيعات", icon: ShoppingBasket, children: [
    { path: "/owner/orders", label: "الطلبات", icon: ClipboardList },
    { path: "/owner/create-order", label: "إنشاء طلب", icon: ShoppingBasket, children: [
      { path: "/owner/create-order/retail", label: "بيع مفرق", icon: ShoppingBasket },
      { path: "/owner/create-order/wholesale", label: "بيع جملة", icon: ShoppingBasket },
    ] },
  ] },
  { label: "الحسابات", icon: Users, children: [
    { path: "/owner/accounts", label: "جميع الحسابات", icon: Users },
    { path: "/owner/vouchers", label: "سندات القبض والصرف والقيد", icon: FileText },
    { path: "/owner/checks", label: "الشيكات", icon: Banknote },
    { path: "/owner/treasury", label: "الخزينة", icon: Banknote },
    { path: "/owner/returns", label: "المردودات", icon: ReceiptText },
    { path: "/owner/purchases", label: "المشتريات", icon: ReceiptText },
  ] },
  { label: "المنتجات والمخزون", icon: Boxes, children: [
    { path: "/owner/products", label: "المنتجات", icon: Package },
    { path: "/owner/inventory", label: "المخزون", icon: Boxes },
    { path: "/owner/categories", label: "إدارة التصنيفات", icon: Settings2, aliases: ["/owner/product-settings"] },
  ] },
  { label: "الإدارة", icon: Settings2, children: [
    { path: "/owner/reps", label: "المناديب", icon: Users },
    { path: "/owner/settings", label: "بيانات الشركة", icon: Store, aliases: ["/owner/company"] },
  ] },
  { path: "/owner/reports", label: "التقارير", icon: BarChart3 },
];

export const repNavigation: NavItem[] = [
  { path: "/rep", label: "لوحة التحكم", icon: LayoutDashboard },
  { label: "المبيعات", icon: ShoppingCart, children: [
    { path: "/rep/products", label: "منتجات الجملة", icon: Boxes },
    { path: "/rep/orders/new", label: "إنشاء طلب", icon: ShoppingCart, badge: true, aliases: ["/rep/create-order"] },
    { path: "/rep/orders", label: "الطلبات", icon: ClipboardList },
  ] },
  { label: "الحسابات", icon: Users, children: [
    { path: "/rep/accounts", label: "الحسابات", icon: Users },
    { path: "/rep/payments", label: "قبض وصرف", icon: FileText },
    { path: "/rep/purchases", label: "المشتريات", icon: ClipboardList },
    { path: "/rep/returns", label: "المردودات", icon: FileText },
  ] },
];

export const isGroup = (item: NavItem): item is NavGroup => "children" in item;
export const isBranch = (item: NavChild): item is NavBranch => "children" in item;
export const matchesPath = (current: string, path: string) =>
  current === path || (path !== "/owner" && path !== "/rep" && current.startsWith(`${path}/`));

// Prefer the longest matching route so /rep/orders/new wins over /rep/orders.
export function activePath(items: NavItem[], current: string) {
  const links = items.flatMap((item) => isGroup(item)
    ? item.children.flatMap((child) => isBranch(child) ? child.children : [child]) : [item]);
  return links.flatMap((link) => [link.path, ...(link.aliases ?? [])].map((path) => ({ path, link })))
    .filter(({ path }) => matchesPath(current, path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.link.path ?? null;
}
