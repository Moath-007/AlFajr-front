import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Banknote,
  BarChart3,
  Boxes,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings2,
  ShoppingBasket,
  Store,
  Users,
  X,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  adminName: string;
}
type Icon = ComponentType<{ className?: string }>;
type Child = {
  path: string;
  label: string;
  icon: Icon;
  aliases?: string[];
  quick?: boolean;
};
const direct = [
  { path: "/owner", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { path: "/owner/reports", label: "التقارير", icon: BarChart3 },
];
const groups = [
  {
    id: "sales",
    label: "المبيعات",
    icon: ShoppingBasket,
    children: [
      { path: "/owner/orders", label: "الطلبات", icon: ClipboardList },
      {
        path: "/owner/store-sale",
        label: "بيع من المحل",
        icon: ShoppingBasket,
        quick: true,
      },
    ],
  },
  {
    id: "customers",
    label: "الزبائن والحسابات",
    icon: Users,
    children: [
      {
        path: "/owner/customers",
        label: "الزبائن والحسابات",
        icon: Users,
        aliases: ["/owner/receivables", "/owner/returns"],
      },
      {
        path: "/owner/customer-statements",
        label: "كشف حساب زبون",
        icon: FileText,
      },
      { path: "/owner/checks", label: "الشيكات والخزنة", icon: Banknote },
      {
        path: "/owner/customer-purchases",
        label: "مشتريات الزبائن",
        icon: ReceiptText,
      },
    ],
  },
  {
    id: "catalog",
    label: "المنتجات والمخزون",
    icon: Boxes,
    children: [
      { path: "/owner/products", label: "المنتجات", icon: Package },
      { path: "/owner/inventory", label: "المخزون", icon: Boxes },
      {
        path: "/owner/categories",
        label: "إدارة التصنيفات",
        icon: Settings2,
        aliases: ["/owner/product-settings"],
      },
    ],
  },
  {
    id: "admin",
    label: "الإدارة",
    icon: Settings2,
    children: [
      { path: "/owner/reps", label: "المناديب", icon: Users },
      {
        path: "/owner/settings",
        label: "بيانات الشركة",
        icon: Store,
        aliases: ["/owner/company"],
      },
    ],
  },
] satisfies Array<{ id: string; label: string; icon: Icon; children: Child[] }>;
const matches = (current: string, path: string, exact = false) =>
  exact ? current === path : current === path || current.startsWith(`${path}/`);
const childActive = (current: string, child: Child) =>
  [child.path, ...(child.aliases ?? [])].some((path) => matches(current, path));

export default function OwnerSidebar({
  currentPath,
  onNavigate,
  onLogout,
  adminName,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("al-fajr-admin-sidebar-collapsed") === "true",
  );
  const [confirmLogout, setConfirmLogout] = useState(false);
  const currentGroup = useMemo(
    () =>
      groups.find((group) =>
        group.children.some((child) => childActive(currentPath, child)),
      )?.id ?? null,
    [currentPath],
  );
  const [expanded, setExpanded] = useState<string | null>(currentGroup);
  useEffect(() => setExpanded(currentGroup), [currentGroup]);
  const go = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };
  const toggleGroup = (id: string) => {
    if (collapsed) {
      setCollapsed(false);
      localStorage.setItem("al-fajr-admin-sidebar-collapsed", "false");
      setExpanded(id);
    } else setExpanded((value) => (value === id ? null : id));
  };
  const content = (
    <>
      <div className="shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => go("/owner")}
            className="flex min-w-0 items-center gap-3 text-right"
          >
            <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assets/al-fajr-logo.webp"
                alt="شعار شركة الفجر"
                className="h-full w-full object-cover object-[center_45%]"
              />
            </span>
            <span className={collapsed ? "lg:hidden" : "min-w-0"}>
              <strong className="block truncate text-white">شركة الفجر</strong>
              <small className="text-stone-400">لوحة الإدارة</small>
            </span>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-stone-300 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X />
          </button>
        </div>
        <div
          className={`mt-3 rounded-xl bg-white/5 px-3 py-2 ${collapsed ? "lg:hidden" : ""}`}
        >
          <small className="block text-stone-400">مدير النظام</small>
          <strong className="block truncate text-sm text-white">
            {adminName}
          </strong>
        </div>
      </div>
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="قائمة الإدارة"
      >
        <Direct
          item={direct[0]}
          active={matches(currentPath, "/owner", true)}
          collapsed={collapsed}
          onClick={() => go("/owner")}
        />
        {groups.map((group) => {
          const activeParent = currentGroup === group.id;
          const isOpen = expanded === group.id;
          const Icon = group.icon;
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                title={collapsed ? group.label : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-gold ${collapsed ? "lg:justify-center lg:px-2" : ""} ${activeParent ? "text-gold" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>
                  {group.label}
                </span>
                <ChevronDown
                  className={`mr-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""} ${collapsed ? "lg:hidden" : ""}`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-150 ${collapsed ? "lg:hidden" : ""} ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <div className="mt-1 space-y-1 rounded-xl bg-black/10 p-1.5">
                    {group.children.map((child) => (
                      <ChildLink
                        key={child.path}
                        child={child}
                        active={childActive(currentPath, child)}
                        onClick={() => go(child.path)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <Direct
          item={direct[1]}
          active={matches(currentPath, "/owner/reports")}
          collapsed={collapsed}
          onClick={() => go("/owner/reports")}
        />
      </nav>
      <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => go("/")}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-stone-300 hover:bg-white/10"
        >
          <House className="h-5 w-5" />
          <span className={collapsed ? "lg:hidden" : ""}>الرئيسية العامة</span>
        </button>
        <button
          onClick={() => {
            setMobileOpen(false);
            setConfirmLogout(true);
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-red-200 hover:bg-red-500/15"
        >
          <LogOut className="h-5 w-5" />
          <span className={collapsed ? "lg:hidden" : ""}>تسجيل الخروج</span>
        </button>
      </div>
    </>
  );
  const toggleCollapse = () =>
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("al-fajr-admin-sidebar-collapsed", String(next));
      return next;
    });
  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-xl bg-brand p-3 text-white shadow-lg lg:hidden"
        aria-label="فتح قائمة الإدارة"
      >
        <Menu />
      </button>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-brand transition-[width] lg:flex ${collapsed ? "w-20" : "w-64"}`}
      >
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute -left-3 top-6 z-10 rounded-full bg-gold p-1.5 text-brand shadow"
          aria-label={
            collapsed ? "فتح القائمة الجانبية" : "طي القائمة الجانبية"
          }
          title={collapsed ? "فتح القائمة" : "طي القائمة"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,290px)] flex-col overflow-hidden bg-brand">
            {content}
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          onLogout();
        }}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج؟"
        confirmLabel="تسجيل الخروج"
      />
    </>
  );
}
function Direct({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: { label: string; icon: Icon };
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-gold ${collapsed ? "lg:justify-center lg:px-2" : ""} ${active ? "bg-gold text-brand shadow-sm" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className="h-5 w-5" />
      <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
    </button>
  );
}
function ChildLink({
  child,
  active,
  onClick,
}: {
  child: Child;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = child.icon;
  return (
    <button
      onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-right text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-gold text-brand shadow-sm" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className="h-4 w-4" />
      <span>{child.label}</span>
      {child.quick && (
        <span
          className={`mr-auto h-1.5 w-1.5 rounded-full ${active ? "bg-brand" : "bg-gold"}`}
          aria-label="إجراء سريع"
        />
      )}
    </button>
  );
}
