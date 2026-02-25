"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="fixed inset-0 z-50 bg-[var(--overlay)] p-4" onClick={onClose}>
      <Card className="mx-auto mt-24 max-w-xl" onClick={(event) => event.stopPropagation()}>
        <p className="text-sm text-muted">{description}</p>
        {lookFors?.length ? (
          <ul className="mt-2 list-disc pl-4 text-sm text-muted">
            {lookFors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
        <div className="mt-3 space-y-2">
          {scaleRows.map((row) => (
            <Card key={row.label} className="p-2">
              <p className="text-sm font-medium text-text">{row.label}</p>
              <p className="text-xs text-muted">{row.guidance}</p>
            </Card>
          ))}
        </div>
        <Button type="button" onClick={onClose} className="mt-3">Close</Button>
      </Card>
    </div>
  );
}
