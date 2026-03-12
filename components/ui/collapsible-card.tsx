import { ReactNode } from "react";

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
  className = "",
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      className={`h-full rounded-2xl border border-border/70 bg-surface/95 shadow-sm backdrop-blur-sm ${className}`}
      open={defaultOpen}
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" }}
    >
      <summary className="group flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="calm-transition text-muted group-open:rotate-180">
          <ChevronDown />
        </span>
      </summary>
      <div className="border-t border-border/50 p-4">{children}</div>
    </details>
  );
}
