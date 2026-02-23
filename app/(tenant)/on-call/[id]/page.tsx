import { prisma } from "@/lib/prisma";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature, requireRole } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

export default async function OnCallDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "ON_CALL");

  const request = await (prisma as any).onCallRequest.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { student: true, createdBy: true, location: true, reason: true, assignedTo: true }
  });
  if (!request) notFound();

  async function setStatus(formData: FormData) {
    "use server";
    const currentUser = await getSessionUserOrThrow();
    requireRole(currentUser, ["LEADER", "SLT", "ADMIN"]);
    const id = String(formData.get("id"));
    const status = String(formData.get("status"));
    await (prisma as any).onCallRequest.updateMany({
      where: { id, tenantId: currentUser.tenantId },
      data: {
        status,
        assignedToId: currentUser.id,
        resolvedAt: status === "RESOLVED" ? new Date() : null
      }
    });
    revalidatePath(`/tenant/on-call/${id}`);
    revalidatePath(`/tenant/on-call/feed`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">On Call request</h1>
      <div className="rounded border bg-white p-4 text-sm space-y-1">
        <p><strong>Student:</strong> {request.student?.fullName} ({request.student?.upn})</p>
        <p><strong>Year:</strong> {request.student?.yearGroup || "-"}</p>
        <p><strong>Category:</strong> {request.category}</p>
        <p><strong>Location:</strong> {request.location?.label || request.locationText || "-"}</p>
        <p><strong>Reason:</strong> {request.reason?.label || "-"}</p>
        <p><strong>Notes:</strong> {request.notes || "-"}</p>
        <p><strong>Status:</strong> {request.status}</p>
      </div>

      {(["LEADER", "SLT", "ADMIN"] as string[]).includes(user.role) ? (
        <form action={setStatus} className="flex gap-2">
          <input type="hidden" name="id" value={request.id} />
          <select name="status" className="border p-2" defaultValue={request.status}>
            <option value="SENT">SENT</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Update</button>
        </form>
      ) : null}
    </div>
  );
}
