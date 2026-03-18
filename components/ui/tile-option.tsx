import { ButtonHTMLAttributes } from "react";

export function TileOption({ selected = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      {...props}
      className={`calm-transition rounded-xl border px-4 py-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${selected ? "border-accent bg-accent text-white font-medium shadow-md ring-2 ring-accent/15" : "border-border/80 bg-white text-text hover:border-accent/25 hover:bg-[#f9fafb]"} ${className}`}
    />
  );
}
