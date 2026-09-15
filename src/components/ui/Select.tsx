import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export interface Option<T extends string | number = string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  onCreate?: (name: string) => Promise<T>;
  createLabel?: (name: string) => string;
}

export default function Select<T extends string | number>({
  options,
  value,
  onChange,
  label,
  placeholder = "اختر...",
  className = "",
  searchable = false,
  searchPlaceholder = "ابحث...",
  emptyText = "لا توجد نتائج",
  loading = false,
  onCreate,
  createLabel = (name) => `+ إضافة "${name}"`,
}: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);
  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const needle = trimmed.toLocaleLowerCase();
    return needle
      ? options.filter((option) =>
          option.label.toLocaleLowerCase().includes(needle),
        )
      : options;
  }, [options, trimmed]);
  const canCreate =
    Boolean(onCreate && trimmed) &&
    !options.some((option) => option.label.trim() === trimmed);
  const itemCount = filtered.length + (canCreate ? 1 : 0);

  const updatePosition = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(rect.width, window.innerWidth - 16);
      const menuHeight = Math.min(
        menuRef.current?.offsetHeight || 320,
        window.innerHeight - 16,
      );
      const top =
        window.innerHeight - rect.bottom >= menuHeight
          ? rect.bottom + 4
          : Math.max(8, rect.top - menuHeight - 4);
      setPosition({
        top,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
      });
    }
  };
  const close = () => {
    setOpen(false);
    setCreateError("");
    setQuery("");
  };
  const choose = (next: T) => {
    onChange(next);
    close();
  };
  const create = async () => {
    if (!onCreate || !canCreate || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      choose(await onCreate(trimmed));
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "تعذر إضافة اللون.",
      );
    } finally {
      setCreating(false);
    }
  };
  const activate = (index: number) => {
    if (!itemCount) return;
    setActive(Math.max(0, Math.min(index, itemCount - 1)));
  };
  const selectActive = () => {
    if (active < filtered.length) choose(filtered[active].value);
    else void create();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      activate(active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activate(active - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      activate(0);
    } else if (event.key === "End") {
      event.preventDefault();
      activate(itemCount - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectActive();
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    setActive(0);
    const update = () => updatePosition();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    requestAnimationFrame(() => searchRef.current?.focus());
    requestAnimationFrame(updatePosition);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        close();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
  useEffect(() => setActive(0), [query]);

  return (
    <div className={className} ref={rootRef}>
      {label && (
        <label id={`${id}-label`} className="rep-label">
          {label}
        </label>
      )}
      <button
        type="button"
        role="combobox"
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          open && itemCount ? `${id}-option-${active}` : undefined
        }
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className="rep-control flex min-h-11 w-full items-center justify-between gap-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span className="min-w-0 truncate">
          {selected?.label || placeholder}
        </span>
        <span
          aria-hidden
          className={`shrink-0 transition ${open ? "rotate-180" : ""}`}
        >
          ⌄
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            className="z-[1000] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
            onKeyDown={onKeyDown}
          >
            {searchable && (
              <div className="border-b p-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="rep-control min-h-11 w-full"
                />
              </div>
            )}
            <div
              id={`${id}-listbox`}
              role="listbox"
              aria-labelledby={label ? `${id}-label` : undefined}
              className="max-h-64 overflow-y-auto p-1"
            >
              {loading ? (
                <p className="p-3 text-sm text-stone-500">جاري التحميل…</p>
              ) : (
                <>
                  {filtered.map((option, index) => (
                    <button
                      id={`${id}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      key={option.value}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(option.value)}
                      className={`block min-h-11 w-full truncate rounded-lg px-3 py-2 text-right text-sm ${active === index ? "bg-stone-100" : ""} ${option.value === value ? "font-black text-brand" : "text-stone-700"}`}
                    >
                      {option.label}
                    </button>
                  ))}
                  {canCreate && (
                    <button
                      id={`${id}-option-${filtered.length}`}
                      type="button"
                      role="option"
                      aria-selected={false}
                      disabled={creating}
                      onMouseEnter={() => setActive(filtered.length)}
                      onClick={() => void create()}
                      className={`block min-h-11 w-full rounded-lg px-3 py-2 text-right text-sm font-black text-gold-dark ${active === filtered.length ? "bg-amber-50" : ""}`}
                    >
                      {creating ? "جاري الإضافة…" : createLabel(trimmed)}
                    </button>
                  )}
                  {!filtered.length && !canCreate && (
                    <p className="p-3 text-sm text-stone-500">{emptyText}</p>
                  )}
                </>
              )}
            </div>
            {createError && (
              <p
                role="alert"
                className="border-t bg-red-50 p-2 text-xs font-bold text-red-700"
              >
                {createError}
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
