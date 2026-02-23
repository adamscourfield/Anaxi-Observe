import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";

export default async function LeavePage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const manager = await canManageLoa(user);

  const requests = await (prisma as any).lOARequest.findMany({
    where: manager ? { tenantId: user.tenantId } : { tenantId: user.tenantId, requesterId: user.id },
    include: { reason: true },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leave of Absence</h1>
      <div className="flex gap-3 text-sm">
        <Link className="underline" href="/tenant/leave/request">Request leave</Link>
        <Link className="underline" href="/tenant/leave/calendar">Calendar</Link>
        {manager ? <Link className="underline" href="/tenant/leave/pending">Pending approvals</Link> : null}
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-medium">Recent requests</h2>
        <ul className="space-y-2 text-sm">
          {(requests as any[]).map((request) => (
            <li key={request.id}>
              <Link className="underline" href={`/tenant/leave/${request.id}`}>
                {new Date(request.startAt).toLocaleDateString()} - {new Date(request.endAt).toLocaleDateString()} · {request.reason?.label} · {request.status}
              </Link>
            </li>
          ))}
          {requests.length === 0 ? <li className="text-slate-600">No leave requests yet.</li> : null}
        </ul>
      </div>
    </div>
  );
}
