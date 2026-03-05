import { ReactNode } from "react";

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
    <details className={`h-full rounded-lg border border-border bg-surface ${className}`} open={defaultOpen}>
      <summary className="group flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-text">
        <span>{title}</span>
        <span className="calm-transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-border p-3">{children}</div>
    </details>
  );
}
