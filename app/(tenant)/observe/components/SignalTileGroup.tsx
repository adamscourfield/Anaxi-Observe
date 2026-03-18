"use client";

type ScaleOption = {
  key: string;
  label: string;
  guidance?: string;
};

const SCALE_STYLES: Record<string, {
  idle: string;
  active: string;
  dot: string;
  number: string;
}> = {
  LIMITED:    { idle: "border-rose-200 bg-rose-50/80 text-rose-800 hover:border-rose-300 hover:bg-rose-50",   active: "border-rose-500 bg-rose-500 text-white ring-2 ring-rose-300/50",    dot: "bg-rose-500",    number: "bg-rose-100 text-rose-600" },
  SOME:       { idle: "border-amber-200 bg-amber-50/80 text-amber-800 hover:border-amber-300 hover:bg-amber-50", active: "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300/50",  dot: "bg-amber-500",   number: "bg-amber-100 text-amber-600" },
  CONSISTENT: { idle: "border-blue-200 bg-blue-50/80 text-blue-800 hover:border-blue-300 hover:bg-blue-50",  active: "border-blue-600 bg-blue-600 text-white ring-2 ring-blue-300/50",    dot: "bg-blue-600",    number: "bg-blue-100 text-blue-700" },
  STRONG:     { idle: "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50", active: "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-300/50", dot: "bg-emerald-600", number: "bg-emerald-100 text-emerald-700" },
};

const SCALE_LABELS: Record<string, string> = {
  LIMITED:    "1 — Limited",
  SOME:       "2 — Some",
  CONSISTENT: "3 — Consistent",
  STRONG:     "4 — Strong",
};

export function SignalTileGroup({
  options,
  selected,
  onSelect,
}: {
  options: ScaleOption[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      {options.map((option, idx) => {
        const styles = SCALE_STYLES[option.key] ?? SCALE_STYLES.CONSISTENT;
        const isSelected = selected === option.key;
        const scaleLabel = SCALE_LABELS[option.key] ?? option.label;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onSelect(option.key)}
            className={`relative w-full rounded-xl border px-4 py-3.5 text-left calm-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isSelected ? styles.active : styles.idle
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Scale number badge */}
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isSelected ? "bg-white/25 text-white" : styles.number
                }`}
              >
                {idx + 1}
              </span>
              <span className="flex-1">
                {/* Scale level name */}
                <span className={`block text-[0.8125rem] font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                  {scaleLabel}
                </span>
                {/* Guidance text */}
                {option.guidance && (
                  <span className={`mt-0.5 block text-[0.75rem] leading-relaxed ${isSelected ? "text-white/80" : "opacity-80"}`}>
                    {option.guidance}
                  </span>
                )}
              </span>
              {/* Check mark when selected */}
              {isSelected && (
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
