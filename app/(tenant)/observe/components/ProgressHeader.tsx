"use client";

import { Button } from "@/components/ui/button";
import { MetaText } from "@/components/ui/typography";

export function ProgressHeader({ current, total, onBack, onExit, canBack }: { current: number; total: number; onBack: () => void; onExit: () => void; canBack: boolean }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" disabled={!canBack} onClick={onBack}>
          <svg viewBox="0 0 16 16" fill="none" className="mr-1 h-3.5 w-3.5"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </Button>
        <MetaText className="font-medium">{current} of {total}</MetaText>
        <Button type="button" variant="ghost" onClick={onExit} aria-label="Close">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </Button>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-divider/60">
        <div className="h-1.5 rounded-full bg-accent calm-transition" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
