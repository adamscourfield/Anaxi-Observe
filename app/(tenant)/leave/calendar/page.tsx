import { getSessionUserOrThrow } from "@/lib/auth";
import { requireFeature } from "@/lib/guards";
import { canManageLoa } from "@/lib/loa";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      startDate: { lt: end },
      endDate: { gte: start }
    },
    include: { requester: true },
    orderBy: { startDate: "asc" }
  });

  const days = Array.from({ length: 31 }, (_, i) => {
    const date = new Date(start);
    date.setDate(i + 1);
    return date;
  }).filter((d) => d.getMonth() === start.getMonth());

  // Monday = 0, Sunday = 6 (ISO week)
  const firstDayOfWeek = (start.getDay() + 6) % 7;
  const today = dayKey(new Date());

  return (
    <div className="space-y-5">
      <PageHeader title={`Leave calendar (${start.toLocaleString("default", { month: "long", year: "numeric" })})`} subtitle="Month view of pending and approved leave requests." />

      <Card className="overflow-hidden p-0">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-bg/60">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.05em] text-muted">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-border/50 bg-bg/20 p-2" />
          ))}

          {days.map((day) => {
            const key = dayKey(day);
            const isToday = key === today;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const entries = (requests as any[]).filter(
              (request) => day >= new Date(request.startDate) && day <= new Date(request.endDate)
            );

            return (
              <div
                key={key}
                className={`min-h-[100px] border-b border-r border-border/50 p-2 calm-transition ${
                  isToday
                    ? "bg-[var(--accent-tint)]"
                    : isWeekend
                    ? "bg-bg/30"
                    : "bg-transparent"
                }`}
              >
                <div className={`mb-1 text-xs font-medium ${isToday ? "text-accent" : "text-muted"}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {entries.map((request) => (
                    <div
                      key={request.id}
                      className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight ${
                        request.status === "APPROVED"
                          ? "bg-[var(--pill-success-bg)] text-success"
                          : "bg-[var(--pill-warning-bg)] text-warning"
                      }`}
                    >
                      {request.requester?.fullName}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Trailing empty cells */}
          {Array.from({ length: (7 - ((firstDayOfWeek + days.length) % 7)) % 7 }).map((_, i) => (
            <div key={`trail-${i}`} className="min-h-[100px] border-b border-r border-border/50 bg-bg/20 p-2" />
          ))}
        </div>
      </Card>
    </div>
  );
}
