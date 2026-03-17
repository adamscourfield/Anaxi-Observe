import Link from "next/link";
import { ReactNode } from "react";

type AccentColor = "accent" | "success" | "warning" | "error" | "info";

const accentBarColors: Record<AccentColor, string> = {
  accent: "bg-[#fe9f9f]",
  success: "bg-[#fe9f9f]",
  warning: "bg-[#fe9f9f]",
  error: "bg-[#fe9f9f]",
  info: "bg-[#fe9f9f]",
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
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className={`h-1 ${accentBarColors[accent]}`} />
      <div className="px-5 py-4">
        <p className="text-[12px] font-medium tracking-[0.06em] text-muted">{label}</p>
        <p className="mt-1 text-[28px] font-bold leading-none tracking-[-0.02em] text-text">{value}</p>
        {context && <p className="mt-1.5 text-[12px] text-muted">{context}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block calm-transition hover:shadow-md rounded-xl">
        {inner}
      </Link>
    );
  }

  return inner;
}
