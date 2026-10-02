import Select from './Select';
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
const two = (value: number) => String(value).padStart(2,"0");
export function StyledDatePicker({ label, value, includeTime = false, onChange }: { label: string; value: string; includeTime?: boolean; onChange: (value: string) => void }) {
  const parsed = value ? new Date(value) : new Date();
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const selectedDate = value ? new Date(value) : null;
  const hour = selectedDate ? two(selectedDate.getHours()) : "00";
  const minute = selectedDate ? two(Math.floor(selectedDate.getMinutes() / 5) * 5) : "00";
  const setDate = (day: number) => {
    const current = selectedDate ?? new Date();
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, current.getHours(), current.getMinutes());
    const date = `${next.getFullYear()}-${two(next.getMonth() + 1)}-${two(next.getDate())}`;
    onChange(`${date}${includeTime ? `T${two(next.getHours())}:${two(next.getMinutes())}` : ""}`);
    if (!includeTime) setOpen(false);
  };
  const setTime = (nextHour: string, nextMinute: string) => {
    const current = selectedDate ?? new Date();
    const date = `${current.getFullYear()}-${two(current.getMonth() + 1)}-${two(current.getDate())}`;
    onChange(`${date}T${nextHour}:${nextMinute}`);
  };
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const days = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const display = selectedDate ? new Intl.DateTimeFormat("ar", { dateStyle: "medium", ...(includeTime ? { timeStyle: "short" as const } : {}) }).format(selectedDate) : "اختر التاريخ";
  return <div ref={root} className="relative"><span className="rep-label">{label}</span><button type="button" className="rep-control flex min-h-11 w-full items-center justify-between text-right" onClick={() => setOpen((current) => !current)}><span className="truncate text-sm">{display}</span><CalendarDays className="h-4 w-4 shrink-0 text-brand"/></button>
    {open && <div className="absolute right-0 top-full z-50 mt-2 w-[290px] max-w-[calc(100vw-2rem)] rounded-xl border border-brand/20 bg-white p-3 shadow-2xl">
      <div className="flex items-center justify-between"><button type="button" className="rounded-lg p-1.5 hover:bg-stone-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4"/></button><strong className="text-sm">{new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(visibleMonth)}</strong><button type="button" className="rounded-lg p-1.5 hover:bg-stone-100" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4"/></button></div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold text-stone-500">{["ح", "ن", "ث", "ر", "خ", "ج", "س"].map((name) => <span key={name} className="py-1">{name}</span>)}</div>
      <div className="grid grid-cols-7 gap-0.5">{Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`}/>)}{Array.from({ length: days }, (_, index) => { const day = index + 1; const selected = selectedDate?.getFullYear() === visibleMonth.getFullYear() && selectedDate?.getMonth() === visibleMonth.getMonth() && selectedDate?.getDate() === day; return <button key={day} type="button" onClick={() => setDate(day)} className={`grid h-8 place-items-center rounded-md text-xs font-bold transition ${selected ? "bg-brand text-white" : "hover:bg-brand-50"}`}>{day}</button>; })}</div>
      {includeTime && <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3"><Select label="الساعة" value={hour} onChange={(next) => setTime(next, minute)} options={Array.from({ length: 24 }, (_, index) => ({ value: two(index), label: two(index) }))}/><Select label="الدقيقة" value={minute} onChange={(next) => setTime(hour, next)} options={Array.from({ length: 12 }, (_, index) => ({ value: two(index * 5), label: two(index * 5) }))}/><button type="button" className="btn-primary col-span-2 py-2" onClick={() => setOpen(false)}>تم</button></div>}
    </div>}
  </div>;
}
