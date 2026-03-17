import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold tracking-[0.01em] calm-transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const variantClasses: Record<Variant, string> = {
  primary:
    "py-2.5 bg-[#4f46e5] text-white shadow-sm hover:bg-[#4338ca] hover:shadow-md active:scale-[0.98] active:bg-[#3730a3]",
  secondary:
    "py-2 border border-border bg-white text-text shadow-sm hover:border-[#ccd3db] hover:bg-[#f8fafc] active:scale-[0.98]",
  ghost:
    "py-2 border border-transparent bg-transparent text-muted hover:bg-white/60 hover:text-text active:scale-[0.98]",
  danger:
    "py-2.5 bg-error text-white shadow-sm hover:bg-red-700 hover:shadow-md active:scale-[0.98]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
