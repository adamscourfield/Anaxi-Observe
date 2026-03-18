import Link from "next/link";
import { ReactNode } from "react";

type AccentColor = "accent" | "success" | "warning" | "error" | "info";

const accentBarColors: Record<AccentColor, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-accent",
};

export function StatCard({
  label,
  value,
  context,
  accent = "accent",
  href,
}: {
  label: string;
  value: string | number;
  context?: ReactNode;
  accent?: AccentColor;
  href?: string;
}) {
  const inner = (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
      <div className={`h-1 ${accentBarColors[accent]}`} />
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
        <p className="mt-1.5 text-[28px] font-bold leading-none tracking-[-0.02em] text-text">{value}</p>
        {context && <p className="mt-2 text-[12px] text-muted">{context}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block calm-transition hover:shadow-md rounded-2xl">
        {inner}
      </Link>
    );
  }

  return inner;
}
