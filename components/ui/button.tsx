import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold tracking-[0.01em] calm-transition disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primaryBtn text-white shadow-sm hover:bg-primaryBtnHover hover:shadow-md active:scale-[0.98] active:bg-primaryBtnActive",
  secondary: "border border-border bg-white text-text shadow-sm hover:bg-bg active:scale-[0.98]",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-bg hover:text-text active:scale-[0.98]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
