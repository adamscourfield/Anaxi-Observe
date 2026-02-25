import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnCallStatusBadge } from "./OnCallStatusBadge";
import { REQUEST_TYPE_LABELS } from "@/modules/oncall/types";

interface OnCallRequestCardProps {
  request: {
    id: string;
    requestType: "BEHAVIOUR" | "FIRST_AID";
    location: string;
    status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "CANCELLED";
    createdAt: Date | string;
    requester: { fullName: string };
    student: { fullName: string; yearGroup?: string | null };
    responder?: { fullName: string } | null;
  };
  canAcknowledge?: boolean;
  canResolve?: boolean;
}

export function OnCallRequestCard({ request, canAcknowledge, canResolve }: OnCallRequestCardProps) {
  const createdAt = new Date(request.createdAt);

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <OnCallStatusBadge status={request.status} />
          <span className="text-xs font-medium text-text">
            {REQUEST_TYPE_LABELS[request.requestType]}
          </span>
          <span className="text-xs text-muted">·</span>
          <span className="text-xs text-muted">{request.location}</span>
        </div>
        <p className="text-sm font-medium text-text">
          {request.student.fullName}
          {request.student.yearGroup ? ` (${request.student.yearGroup})` : ""}
        </p>
        <p className="text-xs text-muted">
          Raised by {request.requester.fullName} · {createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        {request.responder && (
          <p className="text-xs text-muted">Responder: {request.responder.fullName}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Link href={`/tenant/on-call/${request.id}`}>
          <Button variant="secondary" className="text-xs px-3 py-1.5">View</Button>
        </Link>
        {canAcknowledge && request.status === "OPEN" && (
          <form method="POST" action={`/api/oncall/${request.id}/acknowledge`}>
            <Button type="submit" className="text-xs px-3 py-1.5">Acknowledge</Button>
          </form>
        )}
        {canResolve && (request.status === "OPEN" || request.status === "ACKNOWLEDGED") && (
          <form method="POST" action={`/api/oncall/${request.id}/resolve`}>
            <Button type="submit" variant="secondary" className="text-xs px-3 py-1.5">Resolve</Button>
          </form>
        )}
      </div>
    </Card>
  );
}
