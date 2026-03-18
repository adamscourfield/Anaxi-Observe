import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold tracking-[0.01em] calm-transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const variantClasses: Record<Variant, string> = {
  primary:
    "py-2.5 bg-[var(--primary-btn)] text-white shadow-sm hover:bg-[var(--primary-btn-hover)] hover:shadow-md active:scale-[0.98] active:bg-[var(--primary-btn-active)]",
  secondary:
    "py-2.5 border border-border bg-white text-text shadow-sm hover:border-borderHover hover:bg-bg active:scale-[0.98]",
  ghost:
    "py-2.5 border border-transparent bg-transparent text-muted hover:bg-divider hover:text-text active:scale-[0.98]",
  danger:
    "py-2.5 bg-[var(--danger-btn)] text-white shadow-sm hover:bg-[var(--danger-btn-hover)] hover:shadow-md active:scale-[0.98] active:bg-[var(--danger-btn-active)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
