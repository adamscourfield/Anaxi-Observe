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
    orderBy: { startDate: "asc" }
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Pending leave approvals" subtitle="Review and action open requests in your approval scope." />
      <Card className="overflow-hidden p-0">
        {pending.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No pending requests" description="You're all caught up for now." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg/60 text-left text-xs uppercase tracking-[0.05em] text-muted">
                  <th className="px-4 py-2.5 font-medium">Staff member</th>
                  <th className="px-4 py-2.5 font-medium">From</th>
                  <th className="px-4 py-2.5 font-medium">To</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Days</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(pending as any[]).map((request) => {
                  const startDate = new Date(request.startDate);
                  const endDate = new Date(request.endDate);
                  const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
                  return (
                    <tr key={request.id} className="border-b border-border/70 last:border-0 hover:bg-bg/40 calm-transition">
                      <td className="px-4 py-3 font-medium text-text">{request.requester?.fullName}</td>
                      <td className="px-4 py-3 text-muted">{startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-muted">{endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-3 text-muted">{request.reason?.label ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{days}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leave/${request.id}`}
                          className="inline-flex items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text calm-transition hover:border-accent/40 hover:text-accent"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
