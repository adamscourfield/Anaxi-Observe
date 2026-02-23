import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";

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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Leave Calendar ({start.toLocaleString("default", { month: "long" })})</h1>
      <div className="grid grid-cols-1 gap-2">
        {days.map((day) => {
          const entries = (requests as any[]).filter((request) => day >= new Date(request.startAt) && day <= new Date(request.endAt));
          return (
            <div key={dayKey(day)} className="rounded border bg-white p-3 text-sm">
              <p className="font-medium">{day.toLocaleDateString()}</p>
              {entries.length === 0 ? <p className="text-slate-500">No leave</p> : null}
              <ul className="mt-1 space-y-1">
                {entries.map((request) => (
                  <li key={request.id} className={request.status === "APPROVED" ? "text-emerald-700" : "text-amber-700"}>
                    {request.requester?.fullName} · {request.status}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
