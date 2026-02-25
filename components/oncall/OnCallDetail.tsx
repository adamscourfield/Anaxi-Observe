import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnCallStatusBadge } from "./OnCallStatusBadge";
import { REQUEST_TYPE_LABELS } from "@/modules/oncall/types";

interface OnCallDetailProps {
  request: {
    id: string;
    requestType: "BEHAVIOUR" | "FIRST_AID";
    location: string;
    behaviourReasonCategory?: string | null;
    notes?: string | null;
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "CANCELLED";
    createdAt: Date | string;
    acknowledgedAt?: Date | string | null;
    resolvedAt?: Date | string | null;
    requester: { fullName: string; email: string };
    student: { fullName: string; upn: string; yearGroup?: string | null };
    responder?: { fullName: string } | null;
  };
  canAcknowledge?: boolean;
  canResolve?: boolean;
  canCancel?: boolean;
}

function fmt(d?: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function OnCallDetail({ request, canAcknowledge, canResolve, canCancel }: OnCallDetailProps) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <OnCallStatusBadge status={request.status} />
        <span className="text-sm font-medium text-text">{REQUEST_TYPE_LABELS[request.requestType]}</span>
      </div>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="font-medium text-text">Student</span>
          <span className="text-text">{request.student.fullName} ({request.student.upn})</span>

          <span className="font-medium text-text">Year Group</span>
          <span className="text-text">{request.student.yearGroup ?? "—"}</span>

          <span className="font-medium text-text">Type</span>
          <span className="text-text">{REQUEST_TYPE_LABELS[request.requestType]}</span>

          <span className="font-medium text-text">Location</span>
          <span className="text-text">{request.location}</span>

          {request.behaviourReasonCategory && (
            <>
              <span className="font-medium text-text">Reason</span>
              <span className="text-text">{request.behaviourReasonCategory}</span>
            </>
          )}

          {request.notes && (
            <>
              <span className="font-medium text-text">Notes</span>
              <span className="text-text">{request.notes}</span>
            </>
          )}

          <span className="font-medium text-text">Raised by</span>
          <span className="text-text">{request.requester.fullName}</span>

          {request.responder && (
            <>
              <span className="font-medium text-text">Responder</span>
              <span className="text-text">{request.responder.fullName}</span>
            </>
          )}
        </div>
      </Card>

      {/* Timeline */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-text">Timeline</h2>
        <ol className="space-y-2 border-l-2 border-divider pl-4">
          <li className="space-y-0.5">
            <p className="text-xs font-medium text-text">Created</p>
            <p className="text-xs text-muted">{fmt(request.createdAt)}</p>
          </li>
          {request.acknowledgedAt && (
            <li className="space-y-0.5">
              <p className="text-xs font-medium text-text">Acknowledged</p>
              <p className="text-xs text-muted">
                {fmt(request.acknowledgedAt)}
                {request.responder ? ` by ${request.responder.fullName}` : ""}
              </p>
            </li>
          )}
          {request.resolvedAt && (
            <li className="space-y-0.5">
              <p className="text-xs font-medium text-text">Resolved</p>
              <p className="text-xs text-muted">
                {fmt(request.resolvedAt)}
                {request.responder ? ` by ${request.responder.fullName}` : ""}
              </p>
            </li>
          )}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {canAcknowledge && request.status === "OPEN" && (
          <form method="POST" action={`/api/oncall/${request.id}/acknowledge`}>
            <Button type="submit">Acknowledge</Button>
          </form>
        )}
        {canResolve && (request.status === "OPEN" || request.status === "ACKNOWLEDGED") && (
          <form method="POST" action={`/api/oncall/${request.id}/resolve`}>
            <Button type="submit" variant="secondary">Resolve</Button>
          </form>
        )}
        {canCancel && request.status === "OPEN" && (
          <form method="POST" action={`/api/oncall/${request.id}/cancel`}>
            <Button type="submit" variant="ghost">Cancel request</Button>
          </form>
        )}
      </div>

      <Link href="/tenant/on-call" className="text-sm text-muted underline">
        ← Back to On Call inbox
      </Link>
    </div>
  );
}
