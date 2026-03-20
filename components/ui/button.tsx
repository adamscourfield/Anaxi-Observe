import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "tertiary";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-[0.75rem] px-5 text-sm font-semibold tracking-[0.01em] calm-transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const variantClasses: Record<Variant, string> = {
  // Primary: deep slate gradient (per "Glass & Gradient" rule)
  primary:
    "py-2.5 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-container)] text-[var(--on-primary)] shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98]",
  // Secondary: secondary-container background, calm alternative
  secondary:
    "py-2.5 bg-[var(--secondary-container)] text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] active:scale-[0.98]",
  // Ghost: transparent, minimal
  ghost:
    "py-2.5 bg-transparent text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] hover:text-[var(--on-surface)] active:scale-[0.98]",
  // Danger: coral for destructive actions
  danger:
    "py-2.5 bg-[var(--danger-btn)] text-white shadow-sm hover:bg-[var(--danger-btn-hover)] hover:shadow-md active:scale-[0.98] active:bg-[var(--danger-btn-active)]",
  // Tertiary: coral — only for critical "single point of truth" actions
  tertiary:
    "py-2.5 bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
