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
    <div id={id} className={`rounded border p-3 ${unanswered ? "border-amber-300 bg-amber-50/30" : "bg-white"}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-sm">{title}</p>
        <SignalHelpPopover description={description} lookFors={lookFors} options={options} scaleGuidance={scaleGuidance} />
      </div>
      <ScaleChips options={options} value={value} disabled={notObserved} onChange={onValue} />
      <div className="mt-2">
        <NotObservedToggle checked={notObserved} onChange={onNotObserved} />
      </div>
    </div>
  );
}
