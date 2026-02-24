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
    <details className="text-xs text-slate-600">
      <summary className="cursor-pointer select-none">Info</summary>
      <p className="mt-1">{description}</p>
      {lookFors?.length ? (
        <>
          <p className="mt-2 font-medium text-slate-700">Look-fors</p>
          <ul className="mt-1 list-disc pl-4">
            {lookFors.map((lookFor) => (
              <li key={lookFor}>{lookFor}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mt-2 font-medium text-slate-700">Scale guidance</p>
      <div className="mt-1 space-y-1">
        {options.map((option) => (
          <div key={option.key} className="rounded border p-2">
            <p className="font-medium text-slate-800">{option.label}</p>
            <p>{scaleGuidance[option.key]}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
