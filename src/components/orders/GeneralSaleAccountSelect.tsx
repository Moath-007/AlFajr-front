import { matchesSearchText } from '@/utils/searchText';
import type { SaleAccountOption } from "@/api";
import { Check, ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function GeneralSaleAccountSelect({
  accounts, value, onChange, loading, error, onRetry, onNavigate, label = "الحساب *", floating = false,
  searchOptions, onSearch, onLoadMore, hasMore = false,
}: {
  accounts: SaleAccountOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onNavigate?: (path: string) => void;
  label?: string;
  floating?: boolean;
  searchOptions?: SaleAccountOption[];
  onSearch?: (search: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const focusInput = useCallback((node: HTMLInputElement | null) => {
    input.current = node;
    node?.focus({ preventScroll: true });
  }, []);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const chosen = accounts.find((account) => account.id === value);
  const options = searchOptions ?? accounts.filter((account) => matchesSearchText(`${account.name} ${account.account_number ?? ''} ${account.phone ?? ''}`, search));

  useEffect(() => { onSearch?.(search); }, [search, onSearch]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!open || !floating) return;
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom;
      const above = rect.top;
      const placeAbove = below < 300 && above > below;
      const available = placeAbove ? above : below;
      setPlacement({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.min(rect.width, window.innerWidth - 16) - 8)),
        width: Math.min(rect.width, window.innerWidth - 16),
        ...(placeAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        maxHeight: Math.max(80, Math.min(320, available - 14)),
      });
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, floating]);

  const dropdown = <div ref={menu} dir="rtl" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (event.key === "Tab") { setOpen(false); trigger.current?.focus(); }
  }} style={floating ? placement ?? undefined : undefined}
    className={`${floating ? "fixed z-[950] flex flex-col" : "absolute inset-x-0 top-full z-40"} overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl`}>
    <div className="relative shrink-0 border-b p-2">
      <Search className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input ref={focusInput} className="rep-control pr-10" value={search} onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.stopPropagation(); setOpen(false); trigger.current?.focus(); event.preventDefault(); }
          if (event.key === "Enter" && options[0]) { onChange(options[0].id); setOpen(false); trigger.current?.focus(); event.preventDefault(); }
        }} placeholder="ابحث برقم الحساب أو الاسم أو الهاتف" aria-label="ابحث برقم الحساب أو الاسم أو الهاتف" />
    </div>
    <div id={menuId} role="listbox" aria-label={label} className="min-h-0 max-h-60 overflow-y-auto p-1.5">
      {options.map((account) => <button key={account.id} type="button" role="option" aria-selected={account.id === value}
        onClick={() => { onChange(account.id); setOpen(false); trigger.current?.focus(); }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm font-bold text-brand hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold">
        <span className="min-w-0 break-words">{account.name}<small className="block">{account.account_number} {account.phone}</small></span>{account.id === value && <Check className="h-4 w-4 shrink-0" />}
      </button>)}
      {loading && <p role="status" className="p-4 text-center text-sm text-stone-500">جاري تحميل الحسابات…</p>}
      {!loading && options.length === 0 && <p className="p-4 text-center text-sm text-stone-500">لا توجد حسابات مطابقة.</p>}
      {hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className="btn-ghost w-full">تحميل المزيد</button>}
    </div>
  </div>;

  return <div ref={root} className="relative space-y-2">
    <span className="rep-label">{label}</span>
    <button ref={trigger} type="button" disabled={loading || !!error || (!onSearch && accounts.length === 0)}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => { setSearch(""); if (floating) setPlacement(null); setOpen((current) => !current); }}
      className="rep-control flex items-center justify-between gap-3 text-right">
      <span className={chosen ? "truncate font-bold text-brand" : "text-stone-400"}>{chosen?.name ?? (loading ? "جاري تحميل الحسابات…" : "اختر حسابًا")}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-stone-500" />
    </button>
    {open && (floating ? placement && createPortal(dropdown, document.body) : dropdown)}
    {error && <div className="text-sm font-bold text-red-700" role="alert">{error} <button type="button" className="underline" onClick={onRetry}>إعادة المحاولة</button></div>}
    {!loading && !error && accounts.length === 0 && !search && <div className="text-sm font-bold text-amber-800" role="status">
      لا توجد حسابات متاحة للبيع. أنشئ حسابًا مناسبًا أولًا.
      {onNavigate && <button type="button" className="mr-2 underline" onClick={() => onNavigate("/owner/accounts")}>فتح الحسابات</button>}
    </div>}
  </div>;
}
