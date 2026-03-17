"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnCallStatusBadge } from "./OnCallStatusBadge";
import { REQUEST_TYPE_LABELS, STATUS_LABELS } from "@/modules/oncall/types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

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

function timeAgo(dateVal: Date | string): string {
  const ms = Date.now() - new Date(dateVal).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function InboxRow({ r, canAcknowledge, canResolve }: { r: InboxRequest; canAcknowledge?: boolean; canResolve?: boolean }) {
  const router = useRouter();
  const [actionPending, setActionPending] = useState<string | null>(null);
  const showAck = canAcknowledge && r.status === "OPEN";
  const showResolve = canResolve && (r.status === "OPEN" || r.status === "ACKNOWLEDGED");

  async function handleAction(action: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActionPending(action);
    try {
      const res = await fetch(`/api/oncall/${r.id}/${action}`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div
      className="cursor-pointer rounded-xl border border-border/60 bg-surface/60 p-4 calm-transition hover:border-accent/40"
      onClick={() => router.push(`/on-call/${r.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">
            {r.student.fullName}
            {r.student.yearGroup && <span className="ml-1 text-muted">({r.student.yearGroup})</span>}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {REQUEST_TYPE_LABELS[r.requestType]} · {r.location} · raised by {r.requester.fullName}
          </p>
          {r.responder && (
            <p className="mt-0.5 text-xs text-muted">Responder: {r.responder.fullName}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <OnCallStatusBadge status={r.status} />
          <span className="whitespace-nowrap text-xs text-muted">{timeAgo(r.createdAt)}</span>
        </div>
      </div>

      {(showAck || showResolve) && (
        <div className="mt-3 flex gap-2">
          {showAck && (
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              disabled={actionPending === "acknowledge"}
              onClick={(e) => handleAction("acknowledge", e)}
            >
              Acknowledge
            </Button>
          )}
          {showResolve && (
            <Button
              type="button"
              className="px-3 py-1.5 text-xs"
              disabled={actionPending === "resolve"}
              onClick={(e) => handleAction("resolve", e)}
            >
              Resolve
            </Button>
          )}
        </div>
      )}
    </div>
  );
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
        <EmptyState
          title="No requests found"
          description={statusFilter ? `No ${STATUS_LABELS[statusFilter as Status]?.toLowerCase()} requests right now.` : "No on-call requests yet."}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <InboxRow key={r.id} r={r} canAcknowledge={canAcknowledge} canResolve={canResolve} />
          ))}
        </div>
      )}
    </div>
  );
}
