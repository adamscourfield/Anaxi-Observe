"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionStatusBadge } from "./ActionStatusBadge";
import { DueDateIndicator } from "./DueDateIndicator";
import { isActionOverdue } from "@/modules/actions/service";

interface ActionCardProps {
  action: {
    id: string;
    description: string;
    ownerUserId: string;
    owner: { id: string; fullName: string };
    dueDate?: Date | string | null;
    status: "OPEN" | "DONE" | "BLOCKED";
    meeting?: { id: string; title: string } | null;
  };
  currentUserId: string;
  onComplete?: (actionId: string) => void;
}

export function ActionCard({ action, currentUserId, onComplete }: ActionCardProps) {
  const [completing, setCompleting] = useState(false);
  const isOwner = action.ownerUserId === currentUserId;
  const overdue = action.dueDate ? isActionOverdue(new Date(action.dueDate)) : false;
  const isOpen = action.status === "OPEN";

  const borderClass = isOpen && overdue
    ? "border-red-300 bg-red-50"
    : isOpen && action.dueDate && !overdue
    ? ""
    : "";

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/actions/${action.id}/complete`, { method: "POST" });
      if (res.ok) {
        onComplete?.(action.id);
      }
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Card className={`space-y-1 ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text">{action.description}</p>
        <ActionStatusBadge status={action.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="opacity-70">{action.owner.fullName}</span>
        <DueDateIndicator dueDate={action.dueDate} status={action.status} />
        {action.meeting && (
          <Link href={`/tenant/meetings/${action.meeting.id}`} className="underline opacity-60 hover:opacity-100">
            {action.meeting.title}
          </Link>
        )}
      </div>
      {isOwner && isOpen && (
        <div className="pt-1">
          <Button variant="secondary" onClick={handleComplete} disabled={completing} className="text-xs py-1 px-3">
            {completing ? "Marking done…" : "✓ Done"}
          </Button>
        </div>
      )}
    </Card>
  );
}
