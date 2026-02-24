import { notFound } from "next/navigation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { decideLoaRequest } from "../actions";

export default async function LeaveDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");

  const request = await (prisma as any).lOARequest.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { requester: true, reason: true, decisionBy: true }
  });
  if (!request) notFound();
  const manager = request.requesterId !== user.id && (await canManageLoa(user, request.requesterId));
  if (!manager && request.requesterId !== user.id) throw new Error("FORBIDDEN");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leave Request</h1>
      <div className="space-y-1 rounded border bg-white p-4 text-sm">
        <p><strong>Requester:</strong> {request.requester?.fullName}</p>
        <p><strong>Dates:</strong> {new Date(request.startAt).toLocaleString()} - {new Date(request.endAt).toLocaleString()}</p>
        <p><strong>Reason:</strong> {request.reason?.label}</p>
        <p><strong>Cover notes:</strong> {request.coverNotes || "-"}</p>
        <p><strong>Status:</strong> {request.status}</p>
        <p><strong>Decision:</strong> {request.decisionType || "-"} {request.decisionBy ? `by ${request.decisionBy.fullName}` : ""}</p>
        <p><strong>Decision notes:</strong> {request.decisionNotes || "-"}</p>
      </div>

      {manager && request.status === "PENDING" ? (
        <form action={decideLoaRequest} className="grid max-w-2xl grid-cols-2 gap-3 rounded border bg-white p-4">
          <input type="hidden" name="requestId" value={request.id} />
          <label className="text-sm">Decision</label>
          <select name="decisionType" className="border p-2" defaultValue="PAID">
            <option value="PAID">Approve - Paid</option>
            <option value="UNPAID">Approve - Unpaid</option>
            <option value="DENIED">Deny</option>
          </select>

          <label className="col-span-2 text-sm">Decision notes</label>
          <textarea name="decisionNotes" rows={3} className="col-span-2 border p-2" />
          <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white" type="submit">Save decision</button>
        </form>
      ) : null}
    </div>
  );
}
