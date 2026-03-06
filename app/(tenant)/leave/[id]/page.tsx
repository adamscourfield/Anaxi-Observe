import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { decideLoaRequest } from "../actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";

export default async function LeaveDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");

  const request = await (prisma as any).lOARequest.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { requester: true, reason: true }
  });
  if (!request) notFound();
  const manager = request.requesterId !== user.id && (await canManageLoa(user, request.requesterId));
  if (!manager && request.requesterId !== user.id) throw new Error("FORBIDDEN");

  return (
    <div className="space-y-5">
      <PageHeader title="Leave request" subtitle="Review leave details and decision history." />
      <Card className="space-y-1 text-sm">
        <p><strong>Requester:</strong> {request.requester?.fullName}</p>
        <p><strong>Dates:</strong> {new Date(request.startDate).toLocaleString()} - {new Date(request.endDate).toLocaleString()}</p>
        <p><strong>Reason:</strong> {request.reason?.label}</p>
        <p><strong>Notes:</strong> {request.notes || "-"}</p>
        <p><strong>Status:</strong> {request.status}</p>
      </Card>

      {manager && request.status === "PENDING" ? (
        <Card>
          <SectionHeader title="Make a decision" className="mb-3" />
          <form action={decideLoaRequest} className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="requestId" value={request.id} />
            <label htmlFor="loa-decision" className="text-sm text-muted">Decision</label>
            <select id="loa-decision" name="decisionType" className="rounded-md border border-border bg-bg/60 p-2 text-sm text-text" defaultValue="APPROVED">
              <option value="APPROVED">Approve</option>
              <option value="DENIED">Deny</option>
            </select>

            <label htmlFor="loa-decision-notes" className="sm:col-span-2 text-sm text-muted">Decision notes</label>
            <textarea id="loa-decision-notes" name="decisionNotes" rows={3} className="sm:col-span-2 rounded-md border border-border bg-bg/60 p-2 text-sm text-text" />
            <Button className="sm:col-span-2" type="submit">Save decision</Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
