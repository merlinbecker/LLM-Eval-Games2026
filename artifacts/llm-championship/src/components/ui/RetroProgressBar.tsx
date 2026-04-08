export function RetroProgressBar({ percent, active = false }: { percent: number; active?: boolean }) {
  return (
    <div className="w-full h-3 border-[2px] border-mac-black bg-mac-white">
      <div
        className={`h-full transition-all duration-500 ${active ? "bg-mac-black" : "bg-pattern-75"}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
