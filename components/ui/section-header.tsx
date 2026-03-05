import Link from "next/link";
import { H2 } from "@/components/ui/typography";

export function SectionHeader({
  title,
  href,
  linkLabel = "View all →",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <H2>{title}</H2>
      {href && (
        <Link href={href} className="text-xs font-medium text-accent hover:text-accentHover">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
