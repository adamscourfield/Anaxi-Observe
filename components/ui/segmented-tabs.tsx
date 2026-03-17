"use client";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface SegmentedTabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function SegmentedTabs({ tabs, activeKey, onChange }: SegmentedTabsProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-[#f4f7fb] p-0.5">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium calm-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active
                ? "bg-white text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-[18px] ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "bg-border/60 text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
