"use client";

import { useState } from "react";
import { OnCallRequestCard } from "./OnCallRequestCard";
import { REQUEST_TYPE_LABELS, STATUS_LABELS } from "@/modules/oncall/types";

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
        <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-3">
          <span className="text-sm font-semibold text-error">{openCount} open request{openCount !== 1 ? "s" : ""}</span>
          <span className="text-xs text-error/70">requiring attention</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as RequestType | "")}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">All types</option>
          {(Object.keys(REQUEST_TYPE_LABELS) as RequestType[]).map((t) => (
            <option key={t} value={t}>{REQUEST_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No requests found.</p>
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
