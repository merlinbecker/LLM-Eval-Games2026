import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

// ─── WINDOW ───
export function RetroWindow({
  title,
  children,
  className,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div className={cn("border-[3px] border-mac-black bg-mac-white retro-shadow flex flex-col relative", className)}>
      <div className="h-8 border-b-[3px] border-mac-black title-stripes flex items-center justify-between px-1 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 bg-mac-white border-[3px] border-mac-black flex items-center justify-center hover:bg-mac-black hover:text-mac-white absolute left-1 z-10"
          >
            <span className="font-display leading-none -mt-1 block">x</span>
          </button>
        )}
        <div className="bg-mac-white border-[3px] border-mac-black px-4 font-display text-sm uppercase tracking-widest absolute left-1/2 -translate-x-1/2">
          {title}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col bg-mac-white z-0">{children}</div>
    </div>
  );
}

// ─── BUTTON ───
export function RetroButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "font-display uppercase tracking-wider border-[3px] border-mac-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-mac-black text-mac-white hover:bg-mac-white hover:text-mac-black retro-shadow-sm": variant === "primary",
          "bg-mac-white text-mac-black hover:bg-mac-black hover:text-mac-white retro-shadow-sm": variant === "secondary",
          "bg-mac-white text-mac-black border-dashed hover:border-solid retro-shadow-sm": variant === "danger",
          "px-3 py-1 text-xs": size === "sm",
          "px-6 py-2 text-sm": size === "md",
          "px-8 py-4 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── INPUT ───
export function RetroInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl focus:outline-none focus:ring-4 focus:ring-mac-black/20 placeholder:text-mac-black/40",
        className
      )}
      {...props}
    />
  );
}

// ─── TEXTAREA ───
export function RetroTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl focus:outline-none focus:ring-4 focus:ring-mac-black/20 placeholder:text-mac-black/40",
        className
      )}
      {...props}
    />
  );
}

// ─── SELECT ───
export function RetroSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full px-3 py-2 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl focus:outline-none appearance-none cursor-pointer",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(45deg, transparent 50%, #000 50%), linear-gradient(135deg, #000 50%, transparent 50%)",
        backgroundPosition:
          "calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── COMBOBOX (searchable select) ───
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
          "w-full px-3 py-2 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          open && "ring-4 ring-mac-black/20"
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setSearch("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        style={{
          backgroundImage:
            "linear-gradient(45deg, transparent 50%, #000 50%), linear-gradient(135deg, #000 50%, transparent 50%)",
          backgroundPosition:
            "calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)",
          backgroundSize: "5px 5px, 5px 5px",
          backgroundRepeat: "no-repeat",
        }}
      >
        <span className={cn(!selectedLabel && "text-mac-black/40")}>
          {selectedLabel || placeholder}
        </span>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-0 border-[3px] border-t-0 border-mac-black bg-mac-white max-h-72 flex flex-col">
          <div className="p-2 border-b-[2px] border-mac-black/30">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2 py-1 border-[2px] border-mac-black bg-mac-white text-mac-black font-sans text-base focus:outline-none focus:ring-2 focus:ring-mac-black/20 placeholder:text-mac-black/40"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-mac-black/40 text-sm font-sans">No results</div>
            ) : (
              filtered.map(o => (
                <button
                  type="button"
                  key={o.value}
                  className={cn(
                    "w-full text-left px-3 py-2 font-sans text-base hover:bg-mac-black hover:text-mac-white cursor-pointer",
                    o.value === value && "bg-mac-black/10 font-bold"
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

// ─── BADGE ───
export function RetroBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block px-2 py-0.5 border-2 border-mac-black bg-mac-white font-display text-xs uppercase tracking-widest", className)}>
      {children}
    </span>
  );
}

// ─── DIALOG (modal overlay) ───
export function RetroDialog({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 bg-mac-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className={cn("bg-mac-white border-[3px] border-mac-black w-full max-w-md retro-shadow", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-mac-black text-mac-white px-4 py-2 font-display uppercase">{title}</div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── FORM FIELD (label + slot) ───
export function RetroFormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block font-display mb-2 uppercase text-sm">{label}</label>
      {children}
    </div>
  );
}

// ─── ERROR ───
export function RetroError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-sans border-2 border-dashed border-mac-black bg-mac-white px-2 py-1">
      {children}
    </p>
  );
}

// ─── SVG ICONS ───

/** Pixel-art robot head — 1-bit, scalable */
export function RobotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("inline-block", className)} aria-hidden>
      {/* antenna */}
      <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="1" r="1" fill="currentColor" />
      {/* head */}
      <rect x="4" y="5" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* eyes */}
      <rect x="7" y="9" width="3" height="3" fill="currentColor" />
      <rect x="14" y="9" width="3" height="3" fill="currentColor" />
      {/* mouth */}
      <line x1="8" y1="15" x2="16" y2="15" stroke="currentColor" strokeWidth="2" />
      {/* ears */}
      <rect x="1" y="9" width="3" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <rect x="20" y="9" width="3" height="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** CSS/SVG podium — 1st / 2nd / 3rd blocks */
export function PodiumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" className={cn("inline-block", className)} aria-hidden>
      {/* 2nd place block */}
      <rect x="5" y="30" width="35" height="50" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      <text x="22" y="55" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="16" fontWeight="bold">2</text>
      {/* 1st place block */}
      <rect x="42" y="10" width="36" height="70" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      <text x="60" y="45" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="20" fontWeight="bold">1</text>
      {/* 3rd place block */}
      <rect x="80" y="45" width="35" height="35" fill="currentColor" stroke="currentColor" strokeWidth="2" />
      <text x="97" y="65" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="14" fontWeight="bold">3</text>
    </svg>
  );
}

/** Trophy icon — 1-bit SVG */
export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("inline-block", className)} aria-hidden>
      {/* cup */}
      <path d="M7 4h10v6a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="2" />
      {/* handles */}
      <path d="M7 6H4a1 1 0 00-1 1v1a3 3 0 003 3h1" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M17 6h3a1 1 0 011 1v1a3 3 0 01-3 3h-1" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* stem */}
      <line x1="12" y1="15" x2="12" y2="19" stroke="currentColor" strokeWidth="2" />
      {/* base */}
      <rect x="8" y="19" width="8" height="2" fill="currentColor" />
    </svg>
  );
}
