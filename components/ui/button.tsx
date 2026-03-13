import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const baseClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-[0.01em] calm-transition transition duration-200 ease-calm disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primaryBtn text-white shadow-sm hover:-translate-y-[1px] hover:bg-primaryBtnHover hover:shadow-md active:translate-y-0 active:bg-primaryBtnActive",
  secondary: "border border-border bg-white text-text shadow-sm hover:bg-bg hover:border-border",
  ghost: "border border-transparent bg-transparent text-muted hover:bg-bg hover:text-text",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return <button ref={ref} {...props} className={`${baseClass} ${variantClasses[variant]} ${className}`} />;
  }
);
