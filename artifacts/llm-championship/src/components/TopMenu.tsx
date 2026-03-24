import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useVault } from "@/lib/vault/vault-store";
import { useBackgroundActivities } from "@/lib/background-activities";
import { Loader2, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

function ActivityDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { activities, runningCount, unacknowledgedCount, acknowledge, acknowledgeAll } = useBackgroundActivities();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalBadge = runningCount + unacknowledgedCount;
  if (activities.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 px-2 py-0.5 font-display text-xs uppercase border-2 border-mac-black transition-colors",
          runningCount > 0
            ? "bg-mac-black text-mac-white"
            : "hover:bg-mac-black hover:text-mac-white"
        )}
      >
        {runningCount > 0 && <Loader2 className="w-3 h-3 animate-spin" />}
        JOBS
        {totalBadge > 0 && (
          <span className="bg-mac-white text-mac-black border border-mac-black px-1 text-[10px] leading-tight font-bold">
            {totalBadge}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 border-[3px] border-mac-black bg-mac-white retro-shadow z-50 max-h-80 overflow-y-auto">
          <div className="border-b-[3px] border-mac-black px-3 py-1.5 flex items-center justify-between">
            <span className="font-display text-xs uppercase font-bold">Background Jobs</span>
            {unacknowledgedCount > 0 && (
              <button
                onClick={acknowledgeAll}
                className="font-display text-[10px] uppercase border border-mac-black px-1 hover:bg-mac-black hover:text-mac-white"
              >
                ACK ALL
              </button>
            )}
          </div>
          {activities.length === 0 ? (
            <div className="p-3 text-center text-sm">No activities</div>
          ) : (
            activities
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "px-3 py-2 border-b border-mac-black/20 flex items-start gap-2 text-xs",
                    !a.acknowledged && a.status !== "running" && "bg-mac-black/5"
                  )}
                >
                  {a.status === "running" && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" />}
                  {a.status === "completed" && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  {a.status === "error" && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{a.title}</div>
                    <div className="text-[10px] uppercase">
                      {a.status === "running" && (a.progress || "Processing...")}
                      {a.status === "completed" && "Done"}
                      {a.status === "error" && (a.error || "Failed")}
                    </div>
                  </div>
                  {!a.acknowledged && a.status !== "running" && (
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="font-display text-[10px] uppercase border border-mac-black px-1 hover:bg-mac-black hover:text-mac-white flex-shrink-0"
                    >
                      ACK
                    </button>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

export function TopMenu() {
  const [location] = useLocation();
  const { status, lock, exportVault, synced } = useVault();

  const links = [
    { href: "/", label: "Arena" },
    { href: "/datasets", label: "Datasets" },
    { href: "/gateways", label: "Gateways & Models" },
    { href: "/competitions/new", label: "New Competition" },
    { href: "/logs", label: "Logs" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-mac-white border-b-[3px] border-mac-black flex items-center px-4 z-50">
      <div className="font-display font-bold text-xl mr-8 flex items-center">
        <span className="bg-mac-black text-mac-white px-2 py-0.5 mr-2">LLM</span>
        CHAMPIONSHIP
      </div>
      <nav className="flex space-x-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-4 py-1 font-display text-sm uppercase transition-colors border-2 border-transparent",
              location === link.href
                ? "bg-mac-black text-mac-white"
                : "text-mac-black hover:border-mac-black"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {status === "unlocked" && (
        <div className="ml-auto flex items-center gap-2">
          <ActivityDropdown />
          <span
            className={cn(synced ? "retro-dot-on" : "retro-dot")}
            title={synced ? "Synced" : "Syncing..."}
          />
          <button
            onClick={exportVault}
            className="px-2 py-0.5 font-display text-xs uppercase border-2 border-mac-black hover:bg-mac-black hover:text-mac-white transition-colors"
          >
            Export
          </button>
          <button
            onClick={lock}
            className="px-2 py-0.5 font-display text-xs uppercase border-2 border-mac-black hover:bg-mac-black hover:text-mac-white transition-colors"
          >
            Lock
          </button>
        </div>
      )}
    </div>
  );
}
