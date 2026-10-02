import { Minus, Plus } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";

interface QuantityInputProps { value: number; onChange: (value: number) => void; disabled?: boolean; ariaLabel?: string; className?: string; }

export default function QuantityInput({ value, onChange, disabled = false, ariaLabel = "الكمية", className = "" }: QuantityInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  useEffect(() => setDraft(String(value)), [value]);

  const validate = (raw: string) => {
    if (raw === "") return "";
    if (!/^\d+$/.test(raw)) return "أدخل عددًا صحيحًا موجبًا.";
    const next = Number(raw);
    if (next < 1) return "الحد الأدنى للكمية هو 1.";
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
    setDraft(String(value));
  };
  const stepTo = (next: number) => {
    const normalized = Math.max(1, next);
    setDraft(String(normalized));
    setError("");
    onChange(normalized);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (["e", "E", "+", "-", ".", ","].includes(event.key)) event.preventDefault();
  };
  return <div className={className}>
    <div className="flex h-11 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <button type="button" disabled={disabled || value <= 1} onClick={() => stepTo(value - 1)} className="h-full px-3 text-stone-600 disabled:opacity-30" aria-label={`إنقاص ${ariaLabel}`}><Minus className="h-4 w-4" /></button>
      <input type="number" inputMode="numeric" min={1} step={1} value={draft} disabled={disabled} onChange={(event) => edit(event.target.value)} onBlur={normalize} onKeyDown={handleKeyDown} className="h-full w-16 min-w-12 appearance-none border-0 bg-transparent px-1 text-center text-sm font-black text-[#162E21] outline-none [MozAppearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" aria-label={ariaLabel} aria-invalid={Boolean(error)} />
      <button type="button" disabled={disabled} onClick={() => stepTo(value + 1)} className="h-full px-3 text-stone-600 disabled:opacity-30" aria-label={`زيادة ${ariaLabel}`}><Plus className="h-4 w-4" /></button>
    </div>
    {error && <p role="alert" className="mt-1 max-w-56 text-xs font-bold text-red-700">{error}</p>}
  </div>;
}
