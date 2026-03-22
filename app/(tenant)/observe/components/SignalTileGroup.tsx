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
  LIMITED:    { idle: "border-scale-limited-border bg-scale-limited-bg/80 text-scale-limited-text hover:border-scale-limited-bar/50 hover:bg-scale-limited-bg",   active: "border-scale-limited-bar bg-scale-limited-bar text-on-primary ring-2 ring-scale-limited-border",    dot: "bg-scale-limited-bar",    number: "bg-scale-limited-light text-scale-limited-text" },
  SOME:       { idle: "border-scale-some-border bg-scale-some-bg/80 text-scale-some-text hover:border-scale-some-bar/50 hover:bg-scale-some-bg",               active: "border-scale-some-bar bg-scale-some-bar text-on-primary ring-2 ring-scale-some-border",          dot: "bg-scale-some-bar",       number: "bg-scale-some-light text-scale-some-text" },
  CONSISTENT: { idle: "border-scale-consistent-border bg-scale-consistent-bg/80 text-scale-consistent-text hover:border-scale-consistent-bar/50 hover:bg-scale-consistent-bg", active: "border-scale-consistent-bar bg-scale-consistent-bar text-on-primary ring-2 ring-scale-consistent-border", dot: "bg-scale-consistent-bar", number: "bg-scale-consistent-light text-scale-consistent-text" },
  STRONG:     { idle: "border-scale-strong-border bg-scale-strong-bg/80 text-scale-strong-text hover:border-scale-strong-bar/50 hover:bg-scale-strong-bg",     active: "border-scale-strong-bar bg-scale-strong-bar text-on-primary ring-2 ring-scale-strong-border",     dot: "bg-scale-strong-bar",     number: "bg-scale-strong-light text-scale-strong-text" },
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
                  isSelected ? "bg-white/25 text-on-primary" : styles.number
                }`}
              >
                {idx + 1}
              </span>
              <span className="flex-1">
                {/* Scale level name */}
                <span className={`block text-[0.8125rem] font-semibold leading-tight ${isSelected ? "text-on-primary" : ""}`}>
                  {scaleLabel}
                </span>
                {/* Guidance text */}
                {option.guidance && (
                  <span className={`mt-0.5 block text-[0.75rem] leading-relaxed ${isSelected ? "text-on-primary/80" : "opacity-80"}`}>
                    {option.guidance}
                  </span>
                )}
              </span>
              {/* Check mark when selected */}
              {isSelected && (
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-on-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
