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
    <div
      className="rounded-2xl border border-border/60 bg-surface/55 px-5 py-5 shadow-sm backdrop-blur-sm"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</div>
          ) : null}
          <div className="space-y-1">
            <H1>{title}</H1>
            {subtitle ? <MetaText className="max-w-3xl text-[13px] leading-relaxed">{subtitle}</MetaText> : null}
          </div>
          {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
