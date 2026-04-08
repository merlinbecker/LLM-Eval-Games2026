export function RetroFormField({
  label,
  children,
  className,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block font-display mb-2 uppercase text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}
