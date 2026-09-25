import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  FileText,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  repName: string;
  cartCount: number;
}
type Icon = ComponentType<{ className?: string }>;
type Child = { path: string; label: string; icon: Icon; badge?: boolean };
const groups = [
  {
    id: "sales",
    label: "المبيعات",
    icon: ShoppingCart,
    children: [
      { path: "/rep/products", label: "منتجات الجملة", icon: Boxes },
      {
        path: "/rep/orders/new",
        label: "إنشاء طلب",
        icon: ShoppingCart,
        badge: true,
      },
      { path: "/rep/orders", label: "الطلبات", icon: ClipboardList },
    ],
  },
  {
    id: "customers",
    label: "الزبائن والحسابات",
    icon: Users,
    children: [
      { path: "/rep/customers", label: "الزبائن والحسابات", icon: Users },
      {
        path: "/rep/customer-statement",
        label: "كشف حساب زبون",
        icon: FileText,
      },
    ],
  },
] satisfies Array<{ id: string; label: string; icon: Icon; children: Child[] }>;
const matches = (current: string, path: string) =>
  current === path || current.startsWith(`${path}/`);

export default function RepSidebar({
  currentPath,
  onNavigate,
  onLogout,
  repName,
  cartCount,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("al-fajr-rep-sidebar-collapsed") === "true",
  );
  const [confirmLogout, setConfirmLogout] = useState(false);
  const activeChild = useMemo(
    () =>
      groups
        .flatMap((group) => group.children)
        .filter((child) => matches(currentPath, child.path))
        .sort((a, b) => b.path.length - a.path.length)[0]?.path ?? null,
    [currentPath],
  );
  const currentGroup = useMemo(
    () =>
      groups.find((group) =>
        group.children.some((child) => child.path === activeChild),
      )?.id ?? null,
    [activeChild],
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
      localStorage.setItem("al-fajr-rep-sidebar-collapsed", "false");
      setExpanded(id);
    } else setExpanded((value) => (value === id ? null : id));
  };
  const content = (
    <>
      <div className="shrink-0 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => go("/rep")}
            className="flex items-center gap-3 text-right"
          >
            <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assets/al-fajr-logo.webp"
                alt="شعار شركة الفجر"
                className="h-full w-full object-cover object-[center_45%]"
              />
            </span>
            <span className={collapsed ? "lg:hidden" : ""}>
              <strong className="block text-white">شركة الفجر</strong>
              <small className="text-stone-400">بوابة المندوب</small>
            </span>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X />
          </button>
        </div>
        <p
          className={`mt-3 truncate rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-stone-300 ${collapsed ? "lg:hidden" : ""}`}
        >
          {repName}
        </p>
      </div>
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="قائمة المندوب"
      >
        <button
          onClick={() => go("/rep")}
          title={collapsed ? "لوحة التحكم" : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${collapsed ? "lg:justify-center lg:px-2" : ""} ${currentPath === "/rep" ? "bg-gold text-brand shadow-sm" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className={collapsed ? "lg:hidden" : ""}>لوحة التحكم</span>
        </button>
        {groups.map((group) => {
          const Icon = group.icon;
          const activeParent = currentGroup === group.id;
          const isOpen = expanded === group.id;
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                title={collapsed ? group.label : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-gold ${collapsed ? "lg:justify-center lg:px-2" : ""} ${activeParent ? "text-gold" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon className="h-5 w-5" />
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
                    {group.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = activeChild === child.path;
                      return (
                        <button
                          key={child.path}
                          onClick={() => go(child.path)}
                          className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-right text-[13px] font-bold transition focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-gold text-brand shadow-sm" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                          {child.badge && cartCount > 0 && (
                            <span
                              className={`mr-auto rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-brand text-white" : "bg-gold text-brand"}`}
                            >
                              {cartCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => go("/")}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-stone-300 hover:bg-white/10"
        >
          <House className="h-5 w-5" />
          <span className={collapsed ? "lg:hidden" : ""}>العودة للرئيسية</span>
        </button>
        <button
          onClick={() => {
            setMobileOpen(false);
            setConfirmLogout(true);
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-stone-300 hover:bg-red-500/15 hover:text-red-200"
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
      localStorage.setItem("al-fajr-rep-sidebar-collapsed", String(next));
      return next;
    });
  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-xl bg-brand p-3 text-white shadow-lg lg:hidden"
        aria-label="فتح قائمة المندوب"
      >
        <Menu />
      </button>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-brand transition-[width] lg:flex ${collapsed ? "w-20" : "w-72"}`}
      >
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute -left-3 top-6 z-10 rounded-full bg-gold p-1.5 text-brand shadow"
          aria-label={
            collapsed ? "فتح القائمة الجانبية" : "طي القائمة الجانبية"
          }
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
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,290px)] flex-col overflow-hidden bg-brand text-white shadow-2xl">
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
        cancelLabel="إلغاء"
      />
    </>
  );
}
