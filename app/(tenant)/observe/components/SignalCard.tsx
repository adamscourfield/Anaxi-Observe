"use client";

import { ScaleChips } from "./ScaleChips";
import { NotObservedToggle } from "./NotObservedToggle";
import { SignalHelpPopover } from "./SignalHelpPopover";

export function SignalCard({
  id,
  title,
  description,
  lookFors,
  scaleGuidance,
  options,
  value,
  notObserved,
  unanswered,
  onValue,
  onNotObserved
}: {
  id: string;
  title: string;
  description: string;
  lookFors?: string[];
  scaleGuidance: Record<string, string>;
  options: { key: string; label: string; description: string }[];
  value: string;
  notObserved: boolean;
  unanswered: boolean;
  onValue: (value: string) => void;
  onNotObserved: (checked: boolean) => void;
}) {
  return (
    <div
      id={id}
      className={`rounded-2xl border p-4 calm-transition ${
        unanswered
          ? "border-warning/40 bg-[var(--pill-warning-bg)]"
          : "border-border/70 bg-surface/95"
      }`}
      style={unanswered ? undefined : { boxShadow: "0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)" }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text">{title}</p>
        <SignalHelpPopover description={description} lookFors={lookFors} options={options} scaleGuidance={scaleGuidance} />
      </div>
      <ScaleChips options={options} value={value} disabled={notObserved} onChange={onValue} />
      <div className="mt-3">
        <NotObservedToggle checked={notObserved} onChange={onNotObserved} />
      </div>
    </div>
  );
}
