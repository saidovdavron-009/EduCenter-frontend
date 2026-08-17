"use client";
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

// Mirrors components/ui/select.tsx's trigger/content styling, but supports
// multiple values — Radix's Select primitive only allows a single value, and
// building a full custom Listbox for this one field wasn't worth pulling in
// another dependency.
export function MultiSelect({ label, error, placeholder = "Tanlang", options, value, onChange, className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  return (
    <div className="w-full" ref={rootRef}>
      {label && <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]",
            "focus:outline-none focus:ring-2 focus:ring-[#1E3A5F] focus:ring-offset-0 focus:border-transparent",
            error && "border-red-500",
            className
          )}
        >
          <span className={cn("truncate text-left", selectedLabels.length === 0 && "text-[var(--muted-foreground)]")}>
            {selectedLabels.length === 0 ? placeholder : selectedLabels.join(", ")}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg p-1">
            {options.length === 0 && (
              <p className="px-2 py-1.5 text-sm text-[var(--muted-foreground)]">Ma&apos;lumot yo&apos;q</p>
            )}
            {options.map((o) => {
              const checked = value.includes(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className="relative flex w-full items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--muted)] text-left"
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {checked && <Check className="h-4 w-4 text-[#1E3A5F]" />}
                  </span>
                  {o.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
