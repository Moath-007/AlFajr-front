import { useEffect, useState, type FormEvent } from "react";
import {
  LayoutDashboard,
  LogIn,
  Menu,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { usePublicCart, usePublicCompany } from "@/public";
import { useAuth } from "@/auth";

interface PublicHeaderProps {
  onNavigate: (page: string) => void;
  currentPath: string;
  onSearch: (query: string) => void;
  searchQuery: string;
}

const navItems = [
  { id: "home", path: "/", label: "الرئيسية" },
  { id: "products", path: "/products", label: "المنتجات" },
  { id: "categories", path: "/categories", label: "التصنيفات" },
  { id: "about", path: "/about", label: "من نحن" },
  { id: "contact", path: "/contact", label: "اتصل بنا" },
];

export default function PublicHeader({
  onNavigate,
  currentPath,
  onSearch,
  searchQuery,
}: PublicHeaderProps) {
  const { company, status } = usePublicCompany();
  const { totalQuantity } = usePublicCart();
  const { user, isRestoringSession } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => setQuery(searchQuery), [searchQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query.trim());
    setSearchOpen(false);
    setMobileOpen(false);
  };

  const isActive = (path: string) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);
  const companyName = company?.company_name?.trim() || "شركة الفجر";
  const authDestination =
    user?.role === "Admin"
      ? "owner-dashboard"
      : user?.role === "Representative"
        ? "rep-dashboard"
        : "login";
  const authLabel =
    user?.role === "Admin"
      ? "لوحة الإدارة"
      : user?.role === "Representative"
        ? "لوحة المندوب"
        : "تسجيل الدخول";
  const AuthIcon = user ? LayoutDashboard : LogIn;

  return (
    <header className="relative border-b border-stone-200/80 bg-white/95 shadow-[0_6px_24px_rgba(22,46,33,0.05)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 lg:h-[68px]">
          <button
            onClick={() => onNavigate("home")}
            className="group flex min-w-0 shrink-0 items-center gap-3 text-right"
          >
            <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition-transform group-hover:-translate-y-0.5">
              <img
                src="/assets/al-fajr-logo.png"
                alt="شعار شركة الفجر"
                className="h-full w-full object-cover object-[center_45%]"
              />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-52 truncate text-base font-black leading-tight text-[#162E21]">
                {companyName}
              </span>
              <span className="mt-1 block text-[11px] font-bold tracking-wide text-stone-400">
                {status === "loading"
                  ? "جاري تحميل بيانات الشركة…"
                  : "منتجات وتجهيزات الحمامات"}
              </span>
            </span>
          </button>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="التنقل الرئيسي"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`relative rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${isActive(item.path) ? "bg-[#162E21]/[0.07] text-[#162E21]" : "text-stone-600 hover:bg-stone-100 hover:text-[#162E21]"}`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute inset-x-3 -bottom-[11px] h-0.5 rounded-full bg-[#C2A66D]" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isRestoringSession && (
              <button
                onClick={() => onNavigate(authDestination)}
                className="hidden min-h-10 items-center gap-1.5 rounded-xl border border-[#C2A66D]/45 bg-[#C2A66D]/[0.07] px-3.5 text-sm font-extrabold text-[#162E21] transition hover:border-[#C2A66D] hover:bg-[#C2A66D]/15 focus:outline-none focus:ring-2 focus:ring-[#C2A66D]/30 lg:inline-flex"
              >
                <AuthIcon className="h-4 w-4 text-[#C2A66D]" /> {authLabel}
              </button>
            )}
            <button
              onClick={() => onNavigate("cart")}
              className="relative rounded-xl p-2.5 text-stone-600 transition hover:bg-stone-100 hover:text-[#162E21] focus:outline-none focus:ring-2 focus:ring-[#C2A66D]/40"
              aria-label={`السلة${totalQuantity ? `، ${totalQuantity} قطع` : ""}`}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalQuantity > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#C2A66D] px-1 text-[10px] font-black text-[#162E21]">
                  {totalQuantity}
                </span>
              )}
            </button>
            <button
              onClick={() => setSearchOpen((open) => !open)}
              className="rounded-xl p-2.5 text-stone-600 transition hover:bg-stone-100 hover:text-[#162E21] focus:outline-none focus:ring-2 focus:ring-[#C2A66D]/40"
              aria-label="فتح البحث"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-xl p-2.5 text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#C2A66D]/40 lg:hidden"
              aria-label="فتح القائمة"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            onSubmit={submitSearch}
            className="border-t border-stone-100 py-3.5"
          >
            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن منتج…"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 py-3 pe-12 ps-24 text-sm font-medium outline-none transition focus:border-[#C2A66D] focus:bg-white focus:ring-4 focus:ring-[#C2A66D]/10"
                autoFocus
              />
              <button
                type="submit"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-[#162E21] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#21452f]"
              >
                بحث
              </button>
            </div>
          </form>
        )}
      </div>

      {mobileOpen && (
        <div className="border-t border-stone-200 bg-white shadow-lg lg:hidden">
          <nav
            className="mx-auto max-w-7xl space-y-1 px-4 py-4"
            aria-label="قائمة الهاتف"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`block w-full rounded-xl px-4 py-3 text-right text-sm font-bold transition ${isActive(item.path) ? "bg-[#162E21] text-white" : "text-stone-700 hover:bg-stone-50"}`}
              >
                {item.label}
              </button>
            ))}
            <div className="mt-3 border-t border-stone-100 pt-3">
              {!isRestoringSession && (
                <button
                  onClick={() => {
                    onNavigate(authDestination);
                    setMobileOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-50"
                >
                  <AuthIcon className="h-4 w-4 text-[#162E21]" /> {authLabel}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
