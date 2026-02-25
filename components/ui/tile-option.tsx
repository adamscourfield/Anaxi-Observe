import { ButtonHTMLAttributes } from "react";

export function TileOption({ selected = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      {...props}
      className={`calm-transition rounded-lg border px-4 py-3 text-left shadow-sm transition duration-200 ease-calm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "border-accent bg-[var(--accent-tint)] text-text" : "border-border bg-surface text-text hover:border-accentHover"} ${className}`}
    />
  );
}
