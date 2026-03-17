"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { H3, MetaText } from "@/components/ui/typography";

export function SignalHelpSheet({
  open,
  onClose,
  description,
  lookFors,
  scaleRows,
}: {
  open: boolean;
  onClose: () => void;
  description: string;
  lookFors?: string[];
  scaleRows: { label: string; guidance: string }[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] p-4 pt-24" onClick={onClose}>
      <Card className="w-full max-w-xl space-y-4" onClick={(event) => event.stopPropagation()}>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        {lookFors?.length ? (
          <div>
            <H3 className="mb-1.5 text-xs">Look-fors</H3>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted">
              {lookFors.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
        <div className="space-y-2">
          <H3 className="text-xs">Scale guidance</H3>
          {scaleRows.map((row) => (
            <div key={row.label} className="rounded-xl border border-border/50 bg-bg/30 p-3">
              <p className="text-sm font-semibold text-text">{row.label}</p>
              <MetaText className="mt-0.5 leading-relaxed">{row.guidance}</MetaText>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={onClose} className="w-full">Close</Button>
      </Card>
    </div>
  );
}
