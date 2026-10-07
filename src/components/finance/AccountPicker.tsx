import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import type { AccountKind, LedgerAccount } from '@/api';

interface Props {
  accounts: Array<Pick<LedgerAccount,"account_id"|"name"|"kind"> & {account_number?: string | null; code?: string; phone?:string | null}>;
  value: number | null;
  onChange: (id: number | null) => void;
  label: string;
  kinds?: AccountKind[];
  exclude?: number[];
  disabled?: boolean;
  compact?: boolean;
  showIdentity?: boolean;
}

export default function AccountPicker({ accounts, value, onChange, label, kinds, exclude, disabled = false, compact = false, showIdentity = false }: Props) {
  const id = useId();
  const identity = (account: Props['accounts'][number]) => [({General:'حساب عام',Cash:'صندوق نقد',Bank:'بنك'} as Record<string,string>)[account.kind], account.account_number].filter(Boolean).join(' · ');
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const chosen = accounts.find((account) => account.account_id === value);
  const options = useMemo(() => accounts.filter((account) =>
    (!kinds || kinds.includes(account.kind)) && !exclude?.includes(account.account_id) &&
    `${account.name} ${account.account_number ?? account.code ?? ''} ${account.phone ?? ''}`
      .toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [accounts, exclude, kinds, search]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const select = (account: Pick<LedgerAccount,"account_id"|"name"|"kind">) => {
    onChange(account.account_id);
    setSearch('');
    setOpen(false);
  };

  return <div ref={root} className="relative min-w-0">
    <span id={`${id}-label`} className={compact ? 'sr-only' : 'rep-label'}>{label}</span>
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label ${id}-value`}
      onClick={() => { setSearch(''); setActive(0); setOpen((current) => !current); }}
      className={`rep-control flex items-center justify-between gap-3 text-right ${open ? 'border-gold ring-4 ring-gold/10' : ''}`}>
      <span id={`${id}-value`} className={`truncate ${chosen ? 'text-brand' : 'text-stone-400'}`}>{chosen?.name ?? 'اختر الحساب'}{chosen && showIdentity && <span className="block text-xs font-normal opacity-70">{identity(chosen)}</span>}</span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="absolute inset-x-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_45px_-15px_rgba(22,46,33,.3)]">
      <div className="relative border-b border-stone-100 p-2">
        <Search className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input ref={searchRef} className="rep-control pr-10" aria-label={`ابحث في ${label}`} placeholder="ابحث بالاسم أو رقم الحساب أو الهاتف"
          value={search} onChange={(event) => { setSearch(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { setOpen(false); event.preventDefault(); }
            if (event.key === 'ArrowDown') { setActive((index) => Math.min(index + 1, Math.max(0, options.length - 1))); event.preventDefault(); }
            if (event.key === 'ArrowUp') { setActive((index) => Math.max(index - 1, 0)); event.preventDefault(); }
            if (event.key === 'Enter') { if (options[active]) select(options[active]); event.preventDefault(); }
          }} />
      </div>
      <div role="listbox" aria-labelledby={`${id}-label`} className="max-h-60 overflow-y-auto p-1.5">
        {options.map((account, index) => <button type="button" role="option" aria-selected={value === account.account_id}
          key={account.account_id} onMouseEnter={() => setActive(index)} onClick={() => select(account)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-right text-sm ${value === account.account_id ? 'bg-brand text-white' : active === index ? 'bg-brand-50 text-brand' : 'text-brand hover:bg-stone-50'}`}>
          <span className={`min-w-0 font-bold ${showIdentity ? 'break-words' : 'truncate'}`}>{account.name}{showIdentity && <span className="mt-1 block text-xs font-normal opacity-70">{identity(account)}</span>}</span>
          {value === account.account_id && <Check className="h-4 w-4 shrink-0" />}
        </button>)}
        {!options.length && <p className="p-4 text-center text-sm text-stone-500">لا توجد حسابات مطابقة.</p>}
      </div>
    </div>}
  </div>;
}
