import { cn } from "@/lib/utils";

/** Pfeil-Chevron als absolut-positioniertes SVG — kein Inline-backgroundImage */
function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
        <path d="M0 0L5 6L10 0H0Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function RetroSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full px-3 py-2 pr-10 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl focus:outline-none appearance-none cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <SelectChevron />
    </div>
  );
}
