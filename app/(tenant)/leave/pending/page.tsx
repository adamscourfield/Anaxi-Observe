import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa, loaManageableRequesterIds } from "@/lib/loa";
import { prisma } from "@/lib/prisma";

export default async function LeavePendingPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  if (!(await canManageLoa(user))) throw new Error("FORBIDDEN");
  const requesterIds = await loaManageableRequesterIds(user);

  const pending = await (prisma as any).lOARequest.findMany({
    where: {
      tenantId: user.tenantId,
      status: "PENDING",
      AND: [
        { requesterId: { not: user.id } },
        ...(requesterIds ? [{ requesterId: { in: requesterIds } }] : [])
      ]
    },
    include: { requester: true, reason: true },
    orderBy: { startAt: "asc" }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pending Leave Approvals</h1>
      <ul className="space-y-2 rounded border bg-white p-4 text-sm">
        {(pending as any[]).map((request) => (
          <li key={request.id}>
            <Link className="underline" href={`/tenant/leave/${request.id}`}>
              {request.requester?.fullName} · {new Date(request.startAt).toLocaleDateString()} - {new Date(request.endAt).toLocaleDateString()} · {request.reason?.label}
            </Link>
          </li>
        ))}
        {pending.length === 0 ? <li className="text-slate-600">No pending requests.</li> : null}
      </ul>
    </div>
  );
}
