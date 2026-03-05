import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primaryBtn text-white shadow-sm hover:bg-primaryBtnHover active:bg-primaryBtnActive hover:-translate-y-[1px]",
  secondary: "bg-surface border border-border text-text hover:bg-bg",
  ghost: "bg-transparent text-text hover:bg-divider",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`calm-transition rounded-lg px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition duration-200 ease-calm disabled:opacity-40 ${variantClasses[variant]} ${className}`}
    />
  );
}
