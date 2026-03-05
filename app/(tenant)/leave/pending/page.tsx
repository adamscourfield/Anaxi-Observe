import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa, loaManageableRequesterIds } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="space-y-5">
      <PageHeader title="Pending leave approvals" subtitle="Review and action open requests in your approval scope." />
      <Card>
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" description="You're all caught up for now." />
        ) : (
          <ul className="space-y-2 text-sm">
            {(pending as any[]).map((request) => (
              <li key={request.id}>
                <Link className="font-medium text-accent hover:text-accentHover" href={`/tenant/leave/${request.id}`}>
                  {request.requester?.fullName} · {new Date(request.startAt).toLocaleDateString()} - {new Date(request.endAt).toLocaleDateString()} · {request.reason?.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
