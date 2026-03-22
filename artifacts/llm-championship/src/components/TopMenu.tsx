import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function TopMenu() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Arena" },
    { href: "/datasets", label: "Datasets" },
    { href: "/gateways", label: "Gateways" },
    { href: "/competitions/new", label: "New Competition" },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-white border-b-[3px] border-black flex items-center px-4 z-50">
      <div className="font-display font-bold text-xl mr-8 flex items-center">
        <span className="bg-black text-white px-2 py-0.5 mr-2">LLM</span>
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
                ? "bg-black text-white"
                : "text-black hover:border-black"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
