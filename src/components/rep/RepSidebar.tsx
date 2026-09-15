import { useState } from "react";
import {
  Boxes,
  ClipboardList,
  HandCoins,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
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
const items = [
  { path: "/rep", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { path: "/rep/products", label: "منتجات الجملة", icon: Boxes },
  { path: "/rep/orders/new", label: "إنشاء طلب", icon: ShoppingCart },
  { path: "/rep/orders", label: "طلباتي", icon: ClipboardList },
  { path: "/rep/receivables", label: "التحصيلات", icon: HandCoins },
];

export default function RepSidebar({
  currentPath,
  onNavigate,
  onLogout,
  repName,
  cartCount,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("al-fajr-rep-sidebar-collapsed") === "true",
  );
  const [confirmLogout, setConfirmLogout] = useState(false);
  const active = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    if (path === "/rep/orders")
      return currentPath.startsWith(path) && currentPath !== "/rep/orders/new";
    return currentPath.startsWith(path);
  };
  const content = (
    <>
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate("/rep")}
            className="flex items-center gap-3 text-right"
          >
            <span className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
              <img
                src="/assets/al-fajr-logo.png"
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
            onClick={() => setOpen(false)}
            className="p-2 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X />
          </button>
        </div>
        <p className={`mt-5 truncate rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-stone-300 ${collapsed ? "lg:hidden" : ""}`}>
          {repName}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map(({ path, label, icon: Icon, exact }) => (
          <button
            key={path}
            onClick={() => {
              onNavigate(path);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${collapsed ? "lg:justify-center lg:px-2" : ""} ${active(path, exact) ? "bg-gold text-brand" : "text-stone-300 hover:bg-white/10 hover:text-white"}`}
          >
            <Icon className="h-5 w-5" />
            <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
            {path === "/rep/orders/new" && cartCount > 0 && (
              <span className={`mr-auto rounded-full bg-brand px-2 py-0.5 text-[10px] text-white ${collapsed ? "lg:hidden" : ""}`}>
                {cartCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-4">
        <button
          onClick={() => {
            onNavigate("/");
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-stone-300 transition hover:bg-white/10 hover:text-white"
        >
          <House className="h-5 w-5" /> <span className={collapsed ? "lg:hidden" : ""}>العودة للرئيسية</span>
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setConfirmLogout(true);
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-stone-300 transition hover:bg-red-500/15 hover:text-red-200"
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
        aria-label="فتح قائمة المندوب"
      >
        <Menu />
      </button>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-brand transition-[width] lg:flex ${collapsed ? "w-20" : "w-72"}`}>
        <button type="button" onClick={() => setCollapsed((value) => { const next = !value; localStorage.setItem("al-fajr-rep-sidebar-collapsed", String(next)); return next; })} className="absolute -left-3 top-6 z-10 rounded-full bg-gold p-1.5 text-brand shadow" aria-label={collapsed ? "فتح القائمة الجانبية" : "طي القائمة الجانبية"} title={collapsed ? "فتح القائمة" : "طي القائمة"}>
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
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,290px)] flex-col bg-brand text-white shadow-2xl">
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
