import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface PublicSelectOption {
  value: string;
  label: string;
}

interface PublicSelectProps {
  value: string;
  options: PublicSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

interface DropdownPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
}

const VIEWPORT_MARGIN = 8;
const DROPDOWN_GAP = 8;
const MAX_DROPDOWN_HEIGHT = 256;

export default function PublicSelect({
  value,
  options,
  onChange,
  label,
  allLabel,
  placeholder = 'اختر…',
  disabled = false,
  className = '',
  ariaLabel,
}: PublicSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const normalizedOptions = useMemo(
    () => allLabel === undefined ? options : [{ value: '', label: allLabel }, ...options],
    [allLabel, options],
  );
  const selectedIndex = normalizedOptions.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? normalizedOptions[selectedIndex] : undefined;

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, []);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      setIsOpen(false);
      return;
    }

    const width = Math.min(rect.width, viewportWidth - VIEWPORT_MARGIN * 2);
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), viewportWidth - width - VIEWPORT_MARGIN);
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN - DROPDOWN_GAP;
    const spaceAbove = rect.top - VIEWPORT_MARGIN - DROPDOWN_GAP;
    const openAbove = spaceBelow < Math.min(MAX_DROPDOWN_HEIGHT, 180) && spaceAbove > spaceBelow;
    const availableSpace = Math.max(96, openAbove ? spaceAbove : spaceBelow);

    setPosition({
      left,
      width,
      maxHeight: Math.min(MAX_DROPDOWN_HEIGHT, availableSpace),
      ...(openAbove
        ? { bottom: viewportHeight - rect.top + DROPDOWN_GAP }
        : { top: rect.bottom + DROPDOWN_GAP }),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();
    let animationFrame = 0;
    const schedulePositionUpdate = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePosition);
    };
    const resizeObserver = new ResizeObserver(schedulePositionUpdate);
    if (triggerRef.current) resizeObserver.observe(triggerRef.current);
    window.addEventListener('scroll', schedulePositionUpdate, true);
    window.addEventListener('resize', schedulePositionUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', schedulePositionUpdate, true);
      window.removeEventListener('resize', schedulePositionUpdate);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen) optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const open = () => {
    if (disabled) return;
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const choose = (option: PublicSelectOption) => {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (normalizedOptions.length === 0) return;
    setHighlightedIndex((current) => (current + direction + normalizedOptions.length) % normalizedOptions.length);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) open();
      else moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      setHighlightedIndex(0);
      return;
    }

    if (event.key === 'End' && isOpen) {
      event.preventDefault();
      setHighlightedIndex(Math.max(0, normalizedOptions.length - 1));
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      const highlighted = normalizedOptions[highlightedIndex];
      if (highlighted) choose(highlighted);
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === 'Tab') setIsOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} dir="rtl">
      {label && <span id={`${id}-label`} className="mb-2 block text-sm font-black text-[#162E21]">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={isOpen ? `${id}-option-${highlightedIndex}` : undefined}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={!label ? ariaLabel : undefined}
        disabled={disabled}
        onClick={() => isOpen ? setIsOpen(false) : open()}
        onKeyDown={handleKeyDown}
        className={`flex h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white py-2.5 pe-4 ps-3 text-right text-sm font-bold shadow-sm outline-none transition ${
          isOpen
            ? 'border-[#C2A66D] ring-4 ring-[#C2A66D]/10'
            : 'border-stone-200 hover:border-[#C2A66D]/60 hover:bg-stone-50/50 focus:border-[#C2A66D] focus:ring-4 focus:ring-[#C2A66D]/10'
        } disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:shadow-none`}
      >
        <span className={`min-w-0 flex-1 truncate ${selectedOption ? 'text-stone-700' : 'text-stone-400'}`}>{selectedOption?.label ?? placeholder}</span>
        <ChevronDown className={`pointer-events-none h-4 w-4 shrink-0 text-[#C2A66D] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${disabled ? 'text-stone-400' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-labelledby={label ? `${id}-label` : undefined}
          dir="rtl"
          style={{
            position: 'fixed',
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            width: position.width,
            maxHeight: position.maxHeight,
          } satisfies CSSProperties}
          className="z-[60] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(22,46,33,0.16)] animate-fade-in"
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <button
                ref={(element) => { optionRefs.current[index] = element; }}
                id={`${id}-option-${index}`}
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => choose(option)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-right text-sm transition ${
                  isSelected
                    ? 'bg-[#162E21] font-black text-white'
                    : isHighlighted
                      ? 'bg-[#162E21]/[0.07] font-bold text-[#162E21]'
                      : 'font-semibold text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span className="min-w-0 flex-1 leading-6">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-[#E8DCC2]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
