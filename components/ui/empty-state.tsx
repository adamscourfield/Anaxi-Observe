import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { BodyText, MetaText } from "@/components/ui/typography";

function EmptyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="mx-auto mb-3 h-10 w-10 text-muted/40" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h28" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="24" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  mode = "standalone",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  mode?: "standalone" | "embedded";
}) {
  const content = (
    <>
      <EmptyIcon />
      <BodyText className="font-medium">{title}</BodyText>
      {description ? <MetaText className="mx-auto mt-1 max-w-xl">{description}</MetaText> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </>
  );

  if (mode === "embedded") {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-bg/20 px-5 py-10 text-center">
        {content}
      </div>
    );
  }

  return (
    <Card tone="subtle" className="border-dashed py-10 text-center">
      {content}
    </Card>
  );
}
