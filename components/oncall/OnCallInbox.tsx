"use client";

import { useState } from "react";
import { OnCallRequestCard } from "./OnCallRequestCard";
import { REQUEST_TYPE_LABELS, STATUS_LABELS } from "@/modules/oncall/types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";

type Status = "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "CANCELLED";
type RequestType = "BEHAVIOUR" | "FIRST_AID";

interface InboxRequest {
  id: string;
  requestType: RequestType;
  location: string;
  status: Status;
  createdAt: Date | string;
  requester: { fullName: string };
  student: { fullName: string; yearGroup?: string | null };
  responder?: { fullName: string } | null;
}

interface OnCallInboxProps {
  requests: InboxRequest[];
  canAcknowledge?: boolean;
  canResolve?: boolean;
}

export function OnCallInbox({ requests, canAcknowledge, canResolve }: OnCallInboxProps) {
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [typeFilter, setTypeFilter] = useState<RequestType | "">("");

  const openCount = requests.filter((r) => r.status === "OPEN").length;

  const filtered = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter && r.requestType !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {openCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-error/25 bg-[var(--pill-error-bg)] px-4 py-3">
          <StatusPill variant="error" size="sm">{openCount}</StatusPill>
          <span className="text-sm font-medium text-[var(--pill-error-text)]">open request{openCount !== 1 ? "s" : ""} requiring attention</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-surface/60 p-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="field py-1.5"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as RequestType | "")}
          className="field py-1.5"
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
            <option key={t} value={t}>{REQUEST_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No requests found" description="Adjust filters or create a new on-call request." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <OnCallRequestCard
              key={r.id}
              request={r}
              canAcknowledge={canAcknowledge}
              canResolve={canResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
