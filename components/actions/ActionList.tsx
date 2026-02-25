"use client";

import { useState } from "react";
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
}

interface ActionListProps {
  actions: Action[];
  currentUserId: string;
  onComplete?: (actionId: string) => void;
}

const GROUP_ORDER: Status[] = ["OPEN", "BLOCKED", "DONE"];
const GROUP_LABELS: Record<Status, string> = {
  OPEN: "Open",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export function ActionList({ actions, currentUserId, onComplete }: ActionListProps) {
  const grouped = GROUP_ORDER.reduce<Record<Status, Action[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    { OPEN: [], BLOCKED: [], DONE: [] }
  );

  for (const action of actions) {
    if (grouped[action.status]) {
      grouped[action.status].push(action);
    }
  }

  for (const g of GROUP_ORDER) {
    grouped[g].sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }

  if (actions.length === 0) {
    return <p className="text-sm opacity-60">No actions yet.</p>;
  }

  return (
    <div className="space-y-4">
      {GROUP_ORDER.map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text opacity-60">
              {GROUP_LABELS[status]} ({group.length})
            </h3>
            <div className="space-y-2">
              {group.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  currentUserId={currentUserId}
                  onComplete={onComplete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
