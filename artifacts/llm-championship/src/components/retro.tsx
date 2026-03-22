import React from "react";
import { cn } from "@/lib/utils";

// --- WINDOW ---
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
    <div className={cn("border-[3px] border-black bg-white retro-shadow flex flex-col relative", className)}>
      <div className="h-8 border-b-[3px] border-black title-stripes flex items-center justify-between px-1 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 bg-white border-[3px] border-black flex items-center justify-center hover:bg-black hover:text-white absolute left-1 z-10"
          >
            <span className="font-display leading-none -mt-1 block">x</span>
          </button>
        )}
        <div className="bg-white border-[3px] border-black px-4 font-display text-sm uppercase tracking-widest absolute left-1/2 -translate-x-1/2">
          {title}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col bg-white z-0">{children}</div>
    </div>
  );
}

// --- BUTTON ---
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
        "font-display uppercase tracking-wider border-[3px] border-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed",
        {
          "bg-black text-white hover:bg-white hover:text-black retro-shadow-sm": variant === "primary",
          "bg-white text-black hover:bg-black hover:text-white retro-shadow-sm": variant === "secondary",
          "bg-white text-black border-dashed hover:border-solid retro-shadow-sm": variant === "danger",
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

// --- INPUT ---
export function RetroInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 border-[3px] border-black bg-white text-black font-sans text-xl focus:outline-none focus:ring-4 focus:ring-black/20 placeholder:text-black/40",
        className
      )}
      {...props}
    />
  );
}

// --- TEXTAREA ---
export function RetroTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 border-[3px] border-black bg-white text-black font-sans text-xl focus:outline-none focus:ring-4 focus:ring-black/20 placeholder:text-black/40",
        className
      )}
      {...props}
    />
  );
}

// --- SELECT ---
export function RetroSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full px-3 py-2 border-[3px] border-black bg-white text-black font-sans text-xl focus:outline-none appearance-none cursor-pointer",
        className
      )}
      style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, black 50%), linear-gradient(135deg, black 50%, transparent 50%)', backgroundPosition: 'calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)', backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat' }}
      {...props}
    >
      {children}
    </select>
  );
}

// --- BADGE ---
export function RetroBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block px-2 py-0.5 border-2 border-black bg-white font-display text-xs uppercase tracking-widest", className)}>
      {children}
    </span>
  );
}
