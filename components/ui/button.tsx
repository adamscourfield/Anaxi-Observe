import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-[0.01em] calm-transition transition duration-200 ease-calm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-bg";

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-accent/20 bg-primaryBtn text-white shadow-sm hover:-translate-y-[1px] hover:bg-primaryBtnHover hover:shadow-md active:translate-y-0 active:bg-primaryBtnActive",
  secondary: "border border-border/70 bg-surface/90 text-text shadow-sm hover:bg-surface hover:border-border",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-divider/60 hover:text-text",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
