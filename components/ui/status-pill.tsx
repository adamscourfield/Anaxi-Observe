import { ReactNode } from "react";

export type PillVariant = "error" | "warning" | "success" | "neutral";

const pillClasses: Record<PillVariant, string> = {
  error: "bg-[var(--pill-error-bg)] text-[var(--pill-error-text)]",
  warning: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-text)]",
  success: "bg-[var(--pill-success-bg)] text-[var(--pill-success-text)]",
  neutral: "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-text)]",
};

export function StatusPill({
  variant,
  children,
  className = "",
}: {
  variant: PillVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pillClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
