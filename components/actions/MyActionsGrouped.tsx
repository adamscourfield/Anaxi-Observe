"use client";

import { useState, useCallback } from "react";
import { ActionCard } from "./ActionCard";

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
      <div className="flex gap-4 text-sm">
        <span className="text-2xl font-bold text-text">{openCount}</span>
        <span className="self-end text-sm opacity-70">open action{openCount !== 1 ? "s" : ""}</span>
        {blockedCount > 0 && (
          <span className="self-end text-sm font-medium text-yellow-600">{blockedCount} blocked</span>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {TABS.map((tab) => {
          const count = tab === "All" ? openCount + blockedCount + doneCount
            : tab === "Open" ? openCount
            : tab === "Blocked" ? blockedCount
            : doneCount;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-text font-medium text-text"
                  : "text-text opacity-60 hover:opacity-100"
              }`}
            >
              {tab} {count > 0 && <span className="ml-1 text-xs opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {tabActions.length === 0 ? (
        <p className="py-6 text-center text-sm opacity-60">
          {activeTab === "All" ? "No actions assigned to you." : `No ${activeTab.toLowerCase()} actions.`}
        </p>
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
