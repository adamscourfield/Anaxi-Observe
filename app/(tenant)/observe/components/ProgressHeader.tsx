"use client";

import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";

export function ProgressHeader({ current, total, onBack, onExit, canBack }: { current: number; total: number; onBack: () => void; onExit: () => void; canBack: boolean }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" disabled={!canBack} onClick={onBack}>Back</Button>
        <MetaText>{current}/{total}</MetaText>
        <Button type="button" variant="ghost" onClick={onExit}>✕</Button>
      </div>
      <div className="h-2 w-full rounded bg-divider">
        <div className="h-2 rounded bg-primaryBtn calm-transition" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
