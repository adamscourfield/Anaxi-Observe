"use client";

import { useState, useCallback } from "react";
import { ActionCard } from "./ActionCard";
import { EmptyState } from "@/components/ui/empty-state";

type Status = "OPEN" | "BLOCKED" | "DONE";

interface Action {
  id: string;
  description: string;
  ownerUserId: string;
  owner: { id: string; fullName: string };
  dueDate?: Date | string | null;
  status: Status;
  meeting?: { id: string; title: string } | null;
  isOverdue?: boolean;
  daysUntilDue?: number | null;
}

interface Grouped {
  OPEN: Action[];
  BLOCKED: Action[];
  DONE: Action[];
}

interface MyActionsGroupedProps {
  grouped: Grouped;
  currentUserId: string;
}

const TABS = ["All", "Open", "Blocked", "Done"] as const;
type Tab = (typeof TABS)[number];

export function MyActionsGrouped({ grouped: initial, currentUserId }: MyActionsGroupedProps) {
  const [grouped, setGrouped] = useState(initial);
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const handleComplete = useCallback((actionId: string) => {
    setGrouped((prev) => {
      const action = prev.OPEN.find((a) => a.id === actionId) ?? prev.BLOCKED.find((a) => a.id === actionId);
      if (!action) return prev;
      const updated = { ...action, status: "DONE" as Status };
      return {
        OPEN: prev.OPEN.filter((a) => a.id !== actionId),
        BLOCKED: prev.BLOCKED.filter((a) => a.id !== actionId),
        DONE: [updated, ...prev.DONE],
      };
    });
  }, []);

  const openCount = grouped.OPEN.length;
  const blockedCount = grouped.BLOCKED.length;
  const doneCount = grouped.DONE.length;

  function actionsForTab(): Action[] {
    if (activeTab === "Open") return grouped.OPEN;
    if (activeTab === "Blocked") return grouped.BLOCKED;
    if (activeTab === "Done") return grouped.DONE;
    return [...grouped.OPEN, ...grouped.BLOCKED, ...grouped.DONE];
  }

  const tabActions = actionsForTab();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-surface/60 p-1.5">
        {TABS.map((tab) => {
          const count = tab === "All" ? openCount + blockedCount + doneCount
            : tab === "Open" ? openCount
            : tab === "Blocked" ? blockedCount
            : doneCount;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`calm-transition rounded-lg px-3.5 py-2 text-sm font-medium ${
                activeTab === tab
                  ? "bg-[var(--accent-tint)] text-text shadow-sm"
                  : "text-muted hover:bg-divider/50 hover:text-text"
              }`}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {tabActions.length === 0 ? (
        <EmptyState
          title={activeTab === "All" ? "No actions assigned to you" : `No ${activeTab.toLowerCase()} actions`}
          description="Actions created in meetings will appear here."
        />
      ) : (
        <div className="space-y-2">
          {tabActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              currentUserId={currentUserId}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
