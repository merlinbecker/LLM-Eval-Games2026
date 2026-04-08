import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Pfeil-Chevron als absolut-positioniertes SVG — kein Inline-backgroundImage */
function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
        <path d="M0 0L5 6L10 0H0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function RetroCombobox({
  options,
  value,
  onChange,
  placeholder = "-- SELECT --",
  disabled,
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(lower) || o.value.toLowerCase().includes(lower));
  }, [options, search]);

  const selectedLabel = options.find(o => o.value === value)?.label;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 pr-10 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl text-left cursor-pointer disabled:bg-pattern-25 disabled:border-dashed disabled:cursor-not-allowed",
          open && "ring-4 ring-mac-black"
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearch("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <span>
          {selectedLabel || placeholder}
        </span>
      </button>
      <SelectChevron />

      {open && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-0 border-[3px] border-t-0 border-mac-black bg-mac-white max-h-72 flex flex-col">
          <div className="p-2 border-b-[2px] border-mac-black">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border-[2px] border-mac-black bg-mac-white text-mac-black font-sans text-base focus:outline-none focus:ring-2 focus:ring-mac-black placeholder:text-mac-black"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm font-sans">No results</div>
            ) : (
              filtered.map(o => (
                <button
                  type="button"
                  key={o.value}
                  className={cn(
                    "w-full text-left px-3 py-2 font-sans text-base hover:bg-mac-black hover:text-mac-white cursor-pointer",
                    o.value === value && "bg-pattern-12 font-bold"
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
