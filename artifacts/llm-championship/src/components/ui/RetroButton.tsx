import { cn } from "@/lib/utils";

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
        "font-display uppercase tracking-wider border-[3px] border-mac-black transition-all active:translate-y-1 active:translate-x-1 active:shadow-none disabled:bg-pattern-25 disabled:border-dashed disabled:cursor-not-allowed",
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
