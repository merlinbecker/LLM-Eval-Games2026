import { cn } from "@/lib/utils";

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
    <div
      className="fixed inset-0 bg-dither flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
      role="presentation"
    >
      <div
        className={cn("bg-mac-white border-[3px] border-mac-black w-full max-w-md retro-shadow", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-mac-black text-mac-white px-4 py-2 font-display uppercase">{title}</div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}
