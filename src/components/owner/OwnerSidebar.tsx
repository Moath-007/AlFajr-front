import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  HandCoins,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShoppingBasket,
  Store,
  Users,
  X,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
interface Props {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  adminName: string;
}
const items = [
  { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "orders", label: "الطلبات", icon: ClipboardList },
  { id: "store-sale", label: "بيع من المحل", icon: ShoppingBasket },
  { id: "products", label: "المنتجات", icon: Package },
  { id: "inventory", label: "المخزون", icon: Boxes },
  { id: "receivables", label: "التحصيلات", icon: HandCoins },
  { id: "customer-statements", label: "كشف حساب الزبون", icon: FileText },
  { id: "reps", label: "المناديب", icon: Users },
  { id: "product-settings", label: "إدارة التصنيفات", icon: Settings2 },
  { id: "company", label: "بيانات الشركة", icon: Store },
  { id: "reports", label: "التقارير", icon: BarChart3 },
];
export default function OwnerSidebar({
  currentPage,
  onNavigate,
  onLogout,
  adminName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("al-fajr-admin-sidebar-collapsed") === "true",
  );
  const [confirmLogout, setConfirmLogout] = useState(false);
  const go = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };
  const content = (
    <>
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => go("dashboard")}
            className="flex min-w-0 items-center gap-3 text-right"
          >
            <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assets/al-fajr-logo.png"
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
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-stone-300 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X />
          </button>
        </div>
        <div className={`mt-4 rounded-xl bg-white/5 px-3 py-2 ${collapsed ? "lg:hidden" : ""}`}>
          <small className="block text-stone-400">مدير النظام</small>
          <strong className="mt-0.5 block truncate text-sm text-white">
            {adminName}
          </strong>
        </div>
      </div>
      <nav
        className="flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="قائمة الإدارة"
      >
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold transition ${collapsed ? "lg:justify-center lg:px-2" : ""} ${currentPage === id ? "bg-gold text-brand" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon className="h-5 w-5" />
            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
          </button>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => go("public-home")}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-stone-300 hover:bg-white/10"
        >
          <House className="h-5 w-5" /> <span className={collapsed ? "lg:hidden" : ""}>الرئيسية العامة</span>
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setConfirmLogout(true);
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-bold text-red-200 hover:bg-red-500/15"
        >
          <LogOut className="h-5 w-5" /> <span className={collapsed ? "lg:hidden" : ""}>تسجيل الخروج</span>
        </button>
      </div>
    </>
  );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-xl bg-brand p-3 text-white shadow-lg lg:hidden"
        aria-label="فتح قائمة الإدارة"
      >
        <Menu />
      </button>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-brand transition-[width] lg:flex ${collapsed ? "w-20" : "w-64"}`}>
        <button type="button" onClick={() => setCollapsed((value) => { const next = !value; localStorage.setItem("al-fajr-admin-sidebar-collapsed", String(next)); return next; })} className="absolute -left-3 top-6 z-10 rounded-full bg-gold p-1.5 text-brand shadow" aria-label={collapsed ? "فتح القائمة الجانبية" : "طي القائمة الجانبية"} title={collapsed ? "فتح القائمة" : "طي القائمة"}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        {content}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,280px)] flex-col bg-brand">
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
        severity="normal"
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج؟"
        confirmLabel="تسجيل الخروج"
      />
    </>
  );
}
