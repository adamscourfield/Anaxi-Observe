import Link from "next/link";
import { H2, MetaText } from "@/components/ui/typography";

export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "View all →",
  className = "",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`mb-1 flex items-start justify-between gap-3 ${className}`}>
      <div>
        <H2>{title}</H2>
        {subtitle ? <MetaText className="mt-0.5">{subtitle}</MetaText> : null}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-xs font-medium text-accent hover:text-accentHover">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
