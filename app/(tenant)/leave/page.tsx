import Link from "next/link";
import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="space-y-5">
      <PageHeader
        title="Leave of absence"
        subtitle="Track requests, check status, and keep cover arrangements clear."
        actions={
          <>
            <Link href="/tenant/leave/request"><Button>Request leave</Button></Link>
            <Link href="/tenant/leave/calendar"><Button variant="secondary">Calendar</Button></Link>
            {manager ? <Link href="/tenant/leave/pending"><Button variant="secondary">Pending approvals</Button></Link> : null}
          </>
        }
      />

      <Card className="space-y-3">
        <SectionHeader title="Recent requests" />
        {requests.length === 0 ? (
          <EmptyState title="No leave requests yet" description="Submitted requests will appear here with status updates." />
        ) : (
          <ul className="space-y-2 text-sm">
            {(requests as any[]).map((request) => (
              <li key={request.id}>
                <Link className="font-medium text-accent hover:text-accentHover" href={`/tenant/leave/${request.id}`}>
                  {new Date(request.startAt).toLocaleDateString()} - {new Date(request.endAt).toLocaleDateString()} · {request.reason?.label} · {request.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
