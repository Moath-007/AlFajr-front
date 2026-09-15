import { Minus, Plus } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";

interface QuantityInputProps { value: number; max: number; onChange: (value: number) => void; disabled?: boolean; ariaLabel?: string; className?: string; showStock?: boolean; }

export default function QuantityInput({ value, max, onChange, disabled = false, ariaLabel = "الكمية", className = "", showStock = true }: QuantityInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  useEffect(() => setDraft(String(value)), [value]);

  const validate = (raw: string) => {
    if (raw === "") return "";
    if (!/^\d+$/.test(raw)) return "أدخل عددًا صحيحًا موجبًا.";
    const next = Number(raw);
    if (next < 1) return "الحد الأدنى للكمية هو 1.";
    if (next > max) return showStock ? `الكمية المطلوبة أكبر من المخزون المتوفر (${max})` : "الكمية المطلوبة أكبر من الكمية المتوفرة";
    return null;
  };
  const edit = (raw: string) => {
    setDraft(raw);
    const validationError = validate(raw);
    setError(validationError ?? "");
    if (validationError === null) onChange(Number(raw));
  };
  const normalize = () => {
    const validationError = validate(draft);
    if (validationError === null) return;
    if (/^\d+$/.test(draft) && Number(draft) > max && max >= 1) {
      setDraft(String(max));
      onChange(max);
      return;
    }
    setDraft(String(value));
  };
  const stepTo = (next: number) => {
    const normalized = Math.max(1, Math.min(next, max));
    setDraft(String(normalized));
    setError("");
    onChange(normalized);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault();
  };
  const controlsDisabled = disabled || max < 1;
  return <div className={className}>
    <div className="flex h-11 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <button type="button" disabled={controlsDisabled || value <= 1} onClick={() => stepTo(value - 1)} className="h-full px-3 text-stone-600 disabled:opacity-30" aria-label={`إنقاص ${ariaLabel}`}><Minus className="h-4 w-4" /></button>
      <input type="number" inputMode="numeric" min={1} max={max} step={1} value={draft} disabled={controlsDisabled} onChange={(event) => edit(event.target.value)} onBlur={normalize} onKeyDown={handleKeyDown} className="h-full w-16 min-w-12 appearance-none border-0 bg-transparent px-1 text-center text-sm font-black text-[#162E21] outline-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" aria-label={ariaLabel} aria-invalid={Boolean(error)} />
      <button type="button" disabled={controlsDisabled || value >= max} onClick={() => stepTo(value + 1)} className="h-full px-3 text-stone-600 disabled:opacity-30" aria-label={`زيادة ${ariaLabel}`}><Plus className="h-4 w-4" /></button>
    </div>
    {error && <p role="alert" className="mt-1 max-w-56 text-xs font-bold text-red-700">{error}</p>}
  </div>;
}
