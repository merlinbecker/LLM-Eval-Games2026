import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useVault } from "@/lib/vault/vault-store";

export function TopMenu() {
  const [location] = useLocation();
  const { status, lock, exportVault, synced } = useVault();

  const links = [
    { href: "/", label: "Arena" },
    { href: "/datasets", label: "Datasets" },
    { href: "/gateways", label: "Gateways" },
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
