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
    <div className="inline-flex rounded-xl border border-border/80 bg-divider p-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium calm-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
              active
                ? "bg-surface-container-lowest text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-[18px] ${
                  active
                    ? "bg-accent/8 text-accent"
                    : "bg-border/50 text-muted"
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
