import { useEffect, useRef, useState } from "react";
import { ChevronDown, House, LogOut, Menu, X } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { activePath, isBranch, isGroup, ownerNavigation, repNavigation, type NavBranch, type NavChild, type NavItem, type NavLink } from "./navigation";

type Props = {
  role: "owner" | "rep";
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  userName: string;
  cartCount?: number;
  actions?: React.ReactNode;
};

export default function DashboardHeader({ role, currentPath, onNavigate, onLogout, userName, cartCount = 0, actions }: Props) {
  const items = role === "owner" ? ownerNavigation : repNavigation;
  const selected = activePath(items, currentPath);
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setOpen(null); setMobileOpen(false); }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(null); setMobileOpen(false); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { setOpen(null); setMobileOpen(false); }, [currentPath]);
  const go = (path: string) => { setOpen(null); setMobileOpen(false); onNavigate(path); };
  const link = (item: NavLink, mobile = false) => {
    const Icon = item.icon;
    const active = selected === item.path;
    return <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? "page" : undefined}
      className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-right text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "bg-brand text-white" : "text-stone-700 hover:bg-stone-100"} ${mobile ? "" : "whitespace-nowrap"}`}>
      <Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
      {item.badge && cartCount > 0 && <span className="mr-auto rounded-full bg-gold px-2 text-xs text-brand">{cartCount}</span>}
    </button>;
  };
  const branch = (item: NavBranch) => <div key={item.path} className="mt-1 border-t border-stone-100 px-1 pt-3">
    <p className="px-2 pb-2 text-xs font-bold text-stone-500">{item.label}</p>
    <div className="grid grid-cols-2 gap-2">{item.children.map((option) => {
      const active = selected === option.path;
      return <button key={option.path} type="button" onClick={() => go(option.path)}
        aria-current={active ? "page" : undefined}
        className={`min-h-11 rounded-xl border px-2 py-2 text-center text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active ? "border-brand bg-brand text-white" : "border-stone-200 bg-stone-50 text-brand hover:border-gold hover:bg-gold/10"}`}>
        {option.label}
      </button>;
    })}</div>
  </div>;
  const child = (item: NavChild, mobile: boolean) => isBranch(item) ? branch(item) : link(item, mobile);
  const nav = (mobile: boolean) => items.map((item: NavItem) => {
    if (!isGroup(item)) return <div key={item.path} className={mobile ? "" : "shrink-0"}>{link(item, mobile)}</div>;
    const active = item.children.some((entry) => isBranch(entry)
      ? entry.children.some((nested) => nested.path === selected) : entry.path === selected);
    const expanded = open === item.label;
    const Icon = item.icon;
    return <div key={item.label} className={mobile ? "" : "relative shrink-0"}
      onPointerEnter={mobile ? undefined : (event) => { if (event.pointerType === "mouse") setOpen(item.label); }}
      onPointerLeave={mobile ? undefined : (event) => { if (event.pointerType === "mouse") setOpen((current) => current === item.label ? null : current); }}>
      <button type="button" onClick={() => setOpen(expanded ? null : item.label)} aria-expanded={expanded}
        className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${active || expanded ? "bg-gold/15 text-brand" : "text-stone-700 hover:bg-stone-100"}`}>
        <Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span><ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (mobile
        ? <div className="mt-1 grid gap-1 rounded-xl bg-stone-50 p-2">{item.children.map((entry) => child(entry, true))}</div>
        : <div className="absolute right-0 top-full z-50 w-72 pt-2"><div className="grid max-h-[min(70vh,560px)] gap-1 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">{item.children.map((entry) => child(entry, false))}</div></div>)}
    </div>;
  });
  return <>
    <header ref={rootRef} className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur print:hidden" dir="rtl">
      <div className="flex h-[68px] min-w-0 items-center gap-3 px-3 sm:px-5 lg:px-6">
        <button type="button" onClick={() => go(role === "owner" ? "/owner" : "/rep")} className="flex shrink-0 items-center gap-2 text-right">
          <span className="grid h-10 w-12 place-items-center overflow-hidden rounded-lg border border-stone-100 bg-white"><img src="/assets/al-fajr-logo.webp" alt="شعار شركة الفجر" className="h-full w-full object-cover object-[center_45%]" /></span>
          <span className="hidden leading-tight sm:block"><strong className="block text-sm text-brand">شركة الفجر</strong><small className="text-[11px] text-stone-500">{role === "owner" ? "لوحة الإدارة" : "بوابة المندوب"}</small></span>
        </button>
        <nav aria-label={role === "owner" ? "قائمة الإدارة" : "قائمة المندوب"} className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">{nav(false)}</nav>
        <div className="mr-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
          <div className="relative">
            <button type="button" onClick={() => setOpen(open === "user" ? null : "user")} aria-expanded={open === "user"} aria-label="قائمة المستخدم"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-2 text-right text-brand hover:bg-stone-50 sm:px-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-bold text-white">{userName.trim().charAt(0) || "ف"}</span>
              <span className="hidden max-w-28 truncate text-xs font-bold sm:block">{userName}</span><ChevronDown className="h-4 w-4" />
            </button>
            {open === "user" && <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-2xl border bg-white p-2 shadow-xl">
              <p className="border-b px-3 py-2 text-xs text-stone-500">{role === "owner" ? "مدير النظام" : "مندوب"} · {userName}</p>
              <button type="button" onClick={() => go("/")} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-stone-700 hover:bg-stone-100"><House className="h-4 w-4" />الرئيسية العامة</button>
              <button type="button" onClick={() => { setOpen(null); setConfirmLogout(true); }} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />تسجيل الخروج</button>
            </div>}
          </div>
          <button type="button" onClick={() => { setMobileOpen(!mobileOpen); setOpen(null); }} aria-expanded={mobileOpen} aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"} className="grid h-11 w-11 place-items-center rounded-xl border border-stone-200 text-brand xl:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {mobileOpen && <nav aria-label="القائمة المختصرة" className="max-h-[calc(100dvh-68px)] overflow-y-auto border-t bg-white p-3 shadow-lg xl:hidden"><div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{nav(true)}</div></nav>}
    </header>
    <ConfirmDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout(); }} title="تسجيل الخروج" message="هل أنت متأكد أنك تريد تسجيل الخروج؟" confirmLabel="تسجيل الخروج" />
  </>;
}
