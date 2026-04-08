import { cn } from "@/lib/utils";

export function RetroInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 border-[3px] border-mac-black bg-mac-white text-mac-black font-sans text-xl focus:outline-none focus:ring-4 focus:ring-mac-black placeholder:text-mac-black",
        className
      )}
      {...props}
    />
  );
}
