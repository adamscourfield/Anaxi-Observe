"use client";

type ScaleOption = { key: string; label: string; description: string };

export function SignalHelpPopover({
  description,
  lookFors,
  options,
  scaleGuidance,
}: {
  description: string;
  lookFors?: string[];
  options: ScaleOption[];
  scaleGuidance: Record<string, string>;
}) {
  return (
    <details className="text-xs text-muted [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden">
      <summary className="calm-transition cursor-pointer select-none rounded-lg border border-border/50 bg-bg/30 px-2 py-1 font-medium hover:border-border hover:text-text">
        Info
      </summary>
      <div className="mt-2 space-y-3 rounded-xl border border-border/50 bg-bg/30 p-3">
        <p className="text-sm leading-relaxed text-muted">{description}</p>
        {lookFors?.length ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-text">Look-fors</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs">
              {lookFors.map((lookFor) => (
                <li key={lookFor}>{lookFor}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-text">Scale guidance</p>
          <div className="space-y-1.5">
            {options.map((option) => (
              <div key={option.key} className="rounded-xl border border-border/50 bg-surface/60 p-2.5">
                <p className="text-xs font-semibold text-text">{option.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed">{scaleGuidance[option.key]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
}
