"use client";

type ScaleOption = { key: string; label: string; description: string };

export function ScaleChips({ options, value, disabled, onChange }: { options: ScaleOption[]; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.key)}
          title={option.description}
          className={`rounded border px-2 py-1 text-xs ${value === option.key ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
