import { cn } from "@/lib/utils";

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
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-6 h-6 bg-mac-white border-[3px] border-mac-black flex items-center justify-center hover:bg-mac-black hover:text-mac-white absolute left-1 z-10"
          >
            <span className="font-display leading-none -mt-1 block">x</span>
          </button>
        )}
        <div className="bg-mac-white border-[3px] border-mac-black px-4 font-display text-sm uppercase tracking-widest absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {title}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col bg-mac-white z-0">{children}</div>
    </div>
  );
}
