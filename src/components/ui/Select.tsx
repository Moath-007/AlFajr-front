import { useState, useRef, useEffect } from 'react';

// تعريف شكل الخيار الواحد
export interface Option<T extends string | number = string | number> {
    value: T;
    label: string;
}

interface SelectProps<T extends string | number> {
    options: Option<T>[];
    value: T;
    onChange: (value: T) => void;
    placeholder?: string;
    className?: string;
}

export default function Select<T extends string | number>({ options, value, onChange, placeholder = 'اختر...', className = '' }: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="input flex items-center justify-between cursor-pointer bg-white border border-stone-300 rounded-lg px-4 py-2 select-none hover:border-stone-400 transition-colors"
            >
                <span className="text-stone-800">{displayText}</span>
                <svg
                    className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`px-4 py-2 cursor-pointer text-right hover:bg-stone-100 transition-colors ${
                                value === opt.value ? 'bg-brand/10 text-brand font-medium' : 'text-stone-700'
                            }`}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
