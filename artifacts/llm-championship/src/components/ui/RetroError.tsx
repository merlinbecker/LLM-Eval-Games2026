export function RetroError({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-sans border-2 border-dashed border-mac-black bg-mac-white px-2 py-1">
      {children}
    </p>
  );
}
