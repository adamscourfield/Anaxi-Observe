import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function LeaveCalendarPage() {
  const user = await getSessionUserOrThrow();
  await requireFeature(user.tenantId, "LEAVE");
  const manager = await canManageLoa(user);

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const requests = await (prisma as any).lOARequest.findMany({
    where: {
      tenantId: user.tenantId,
      ...(manager ? {} : { requesterId: user.id }),
      status: { in: ["PENDING", "APPROVED"] },
      startAt: { lt: end },
      endAt: { gte: start }
    },
    include: { requester: true },
    orderBy: { startAt: "asc" }
  });

  const days = Array.from({ length: 31 }, (_, i) => {
    const date = new Date(start);
    date.setDate(i + 1);
    return date;
  }).filter((d) => d.getMonth() === start.getMonth());

  return (
    <div className="space-y-5">
      <PageHeader title={`Leave calendar (${start.toLocaleString("default", { month: "long" })})`} subtitle="Month view of pending and approved leave requests." />
      <div className="grid grid-cols-1 gap-2">
        {days.map((day) => {
          const entries = (requests as any[]).filter((request) => day >= new Date(request.startAt) && day <= new Date(request.endAt));
          return (
            <Card key={dayKey(day)} className="space-y-1 p-3 text-sm">
              <p className="font-medium text-text">{day.toLocaleDateString()}</p>
              {entries.length === 0 ? <p className="text-muted">No leave</p> : null}
              <ul className="space-y-1">
                {entries.map((request) => (
                  <li key={request.id} className={request.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}>
                    {request.requester?.fullName} · {request.status}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
