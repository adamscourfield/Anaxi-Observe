import { ReactNode } from "react";
import { H1, MetaText } from "@/components/ui/typography";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  meta,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{eyebrow}</div>
          ) : null}
          <H1>{title}</H1>
          {subtitle ? <MetaText className="max-w-2xl text-[13px] leading-relaxed">{subtitle}</MetaText> : null}
          {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
