import Link from "next/link";
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
      <PageHeader
        title={`Leave calendar (${start.toLocaleString("default", { month: "long", year: "numeric" })})`}
        subtitle="Month view of pending and approved leave requests. Click any day to submit a new request."
        actions={
          <Link
            href="/leave/request"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accentHover calm-transition"
          >
            + New request
          </Link>
        }
      />

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-inset ring-amber-300" />
          Pending approval
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-inset ring-emerald-300" />
          Approved
        </span>
      </div>

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
              <Link
                key={key}
                href={`/leave/request?date=${key}`}
                className={`block min-h-[100px] border-b border-r border-border/50 p-2 calm-transition hover:bg-accent/5 ${
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
                      onClick={(e) => e.preventDefault()}
                    >
                      <Link
                        href={`/leave/${request.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight calm-transition ${
                          request.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {request.requester?.fullName}
                      </Link>
                    </div>
                  ))}
                </div>
              </Link>
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
