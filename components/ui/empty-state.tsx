import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { BodyText, MetaText } from "@/components/ui/typography";

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
      <BodyText className="font-medium">{title}</BodyText>
      {description ? <MetaText className="mt-1 max-w-xl">{description}</MetaText> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </>
  );

  if (mode === "embedded") {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 px-5 py-8 text-center">
        {content}
      </div>
    );
  }

  return (
    <Card tone="subtle" className="border-dashed py-7 text-center">
      {content}
    </Card>
  );
}
