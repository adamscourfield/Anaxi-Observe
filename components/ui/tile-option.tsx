import { ButtonHTMLAttributes } from "react";

export function TileOption({ selected = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      {...props}
      className={`calm-transition rounded-xl border px-4 py-3 text-left shadow-sm transition duration-200 ease-calm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "border-accent/40 bg-[var(--accent-tint)] text-text shadow-md" : "border-border/70 bg-surface/90 text-text hover:border-accent/30 hover:bg-surface"} ${className}`}
    />
  );
}
