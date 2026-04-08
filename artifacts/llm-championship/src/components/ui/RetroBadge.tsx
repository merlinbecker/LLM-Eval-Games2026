import { cn } from "@/lib/utils";

export function RetroBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block px-2 py-0.5 border-2 border-mac-black bg-mac-white font-display text-xs uppercase tracking-widest", className)}>
      {children}
    </span>
  );
}
